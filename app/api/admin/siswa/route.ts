import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for admin siswa API"
  );
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Email transporter (SMTP) - optional but required for sending password emails
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT
  ? Number(process.env.SMTP_PORT)
  : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  `no-reply@${
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ||
    "example.com"
  }`;

let transporter: any | null = null;
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  console.warn(
    "SMTP not configured. Will create an Ethereal test account for email previews in development. To send real emails, set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in env."
  );
}

export async function POST(req: Request) {
  // check that caller is authenticated admin
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user: caller },
    } = await serverSupabase.auth.getUser();
    if (!caller)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: callerProfile } = await serverSupabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Create new siswa (admin only)
  try {
    const body = await req.json();
    let {
      email,
      password: providedPassword,
      full_name,
      sendEmail,
      kelas,
    } = body;

    // If email is not provided by admin, auto-generate one using the student's name
    // Domain can be configured via DEFAULT_STUDENT_EMAIL_DOMAIN in .env.local, otherwise use 'students.example.test'
    const emailDomain =
      process.env.DEFAULT_STUDENT_EMAIL_DOMAIN || "students.example.test";

    // helper to slugify name
    const slugify = (name: string) => {
      return name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s.-]/g, "")
        .trim()
        .replace(/\s+/g, ".")
        .replace(/\.+/g, ".");
    };

    // generate a secure temporary password if not provided
    const generatedPassword =
      providedPassword ||
      randomBytes(9)
        .toString("base64")
        .replace(/\/+|=+|\+/g, "A")
        .slice(0, 12);

    // If email is missing, create a candidate from the name and try to create the user.
    // If collision (email exists), append a short random suffix and retry up to N attempts.
    let created: any = null;
    let createError: any = null;
    const maxAttempts = 6;
    if (!email) {
      const base = slugify(full_name || "siswa") || "siswa";
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const suffix =
          attempt === 0 ? "" : `.${randomBytes(2).toString("hex")}`;
        const candidate = `${base}${suffix}@${emailDomain}`;
        try {
          const res = await supabaseAdmin.auth.admin.createUser({
            email: candidate,
            password: generatedPassword,
            user_metadata: {
              full_name,
              role: "siswa",
            },
            email_confirm: true,
          });
          created = res.data;
          createError = res.error;
          if (!createError && created?.user?.id) {
            email = candidate;
            break;
          }
          // if createError indicates email exists, try next candidate
          const msg = String(createError?.message || "");
          const isEmailExists =
            createError?.status === 409 ||
            createError?.status === 422 ||
            /already|exists|registered/i.test(msg);
          if (!isEmailExists) {
            // unexpected error, stop retrying
            break;
          }
          // otherwise continue to next attempt
        } catch (err: any) {
          createError = err;
          const msg = String(err?.message || "");
          const isEmailExists = /already|exists|registered/i.test(msg);
          if (!isEmailExists) break;
        }
      }
    } else {
      // email provided: create directly
      const res = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generatedPassword,
        user_metadata: { full_name, role: "siswa" },
        email_confirm: true,
      });
      created = res.data;
      createError = res.error;
    }

    if (createError) {
      console.error("createUser error:", createError);
      const msg = String(createError.message || "");
      const isEmailExists =
        createError.status === 409 ||
        createError.status === 422 ||
        /already|exists|registered/i.test(msg);
      if (isEmailExists) {
        try {
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (existingProfile && (existingProfile as any).id) {
            return NextResponse.json(
              { error: "email_exists", id: (existingProfile as any).id },
              { status: 409 }
            );
          }
        } catch (e) {
          console.error(
            "profiles lookup after createUser email_exists error:",
            e
          );
        }
        return NextResponse.json({ error: "email_exists" }, { status: 409 });
      }

      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const userId = created.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Failed to get created user id" },
        { status: 500 }
      );
    }

    // Insert or update profile row (handle possible existing profile to avoid duplicate PK)
    try {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId);
      if (!existing || (Array.isArray(existing) && existing.length === 0)) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert([
            {
              id: userId,
              email,
              full_name,
              role: "siswa",
              kelas: kelas || null,
            },
          ]);
        if (profileError) {
          console.error("insert profile error:", profileError);
          // try to cleanup created user
          await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
          return NextResponse.json(
            { error: profileError.message },
            { status: 500 }
          );
        }
      } else {
        // Profile already exists — update fields instead of inserting
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            email,
            full_name,
            role: "siswa",
            kelas: kelas || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        if (updateError) {
          console.error("update profile error:", updateError);
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }
      }
    } catch (err) {
      console.error("profiles check/insert error:", err);
      // try to cleanup created user
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json(
        { error: "Failed to create or update profile" },
        { status: 500 }
      );
    }

    // Optionally send email with temporary password. If the client sets sendEmail=false
    // we skip sending and return the generated password in the response so the admin
    // can display or download it. If sendEmail is omitted or true, we try to send.
    let emailError: string | null = null;
    let emailPreviewUrl: string | null = null;

    try {
      if (sendEmail === false) {
        // skip sending email on request from client
        emailPreviewUrl = null;
      } else {
        if (!transporter) {
          // create an Ethereal test account and transporter for previewing emails in dev
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
          console.info(
            "Using Ethereal test account for email preview. Preview URLs will be returned in the API response."
          );
        }

        const subject = "Akun Smart Learning - Informasi Login";
        const loginUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
        const text = `Halo ${
          full_name || "Siswa"
        },\n\nAkun Anda telah dibuat oleh administrator.\n\nEmail: ${email}\nPassword sementara: ${generatedPassword}\n\nSilakan masuk di ${loginUrl}/auth/login dan ganti password Anda setelah masuk.\n\nJika Anda tidak mengetahui permintaan ini, hubungi administrator.`;
        const html = `<p>Halo ${full_name || "Siswa"},</p>
        <p>Akun Anda telah dibuat oleh administrator.</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password sementara:</strong> <code>${generatedPassword}</code></li>
        </ul>
        <p>Silakan masuk di <a href="${loginUrl}/auth/login">${loginUrl}/auth/login</a> dan ganti password Anda setelah masuk.</p>
        <p>Jika Anda tidak mengetahui permintaan ini, hubungi administrator.</p>`;

        const info = await transporter.sendMail({
          from: EMAIL_FROM,
          to: email,
          subject,
          text,
          html,
        });

        // If using Ethereal (or any transporter that supports test message URLs), provide preview URL.
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) {
          emailPreviewUrl = preview;
          console.info("Ethereal preview URL:", preview);
        }
      }
    } catch (err: any) {
      console.error("Failed to send email:", err);
      emailError = err?.message || String(err);

      // For development convenience, log the generated temporary password to server console
      // so an admin can copy it if emailing fails. Do NOT do this in production.
      if (process.env.NODE_ENV !== "production") {
        try {
          console.info(`TEMP_PASSWORD_FOR:${email} -> ${generatedPassword}`);
        } catch (e) {
          // ignore logging failure
        }
      }
    }

    // If the caller explicitly asked to skip sending email (sendEmail === false),
    // include the generated temporary password in the response so the admin UI can
    // display it in the table for download/share. This is intentional behaviour for
    // admin-driven account creation. Otherwise, only include the temporary password
    // when email sending failed in non-production (legacy behaviour).
    const resp: any = {
      ok: true,
      id: userId,
      email: email,
      emailError,
      emailPreviewUrl,
    };
    if (sendEmail === false) {
      resp.temporaryPassword = generatedPassword;
    } else if (emailError && process.env.NODE_ENV !== "production") {
      resp.temporaryPassword = generatedPassword;
    }
    return NextResponse.json(resp);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Return list of siswa profiles for admin UI. Must be called by an authenticated admin.
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user: caller },
    } = await serverSupabase.auth.getUser();
    if (!caller)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: callerProfile } = await serverSupabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("role", "siswa")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch siswa profiles:", error);
      return NextResponse.json(
        { error: error.message || "Failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  // Update profile (and optionally email)
  // ensure caller is admin
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user: caller },
    } = await serverSupabase.auth.getUser();
    if (!caller)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: callerProfile } = await serverSupabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      id,
      email,
      full_name,
      kelas,
      jurusan,
      tanggal_lahir,
      jenis_kelamin,
      no_telepon,
      alamat,
    } = body;
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    // Update profiles table
    const updates: any = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (kelas !== undefined) updates.kelas = kelas;
    if (jurusan !== undefined) updates.jurusan = jurusan;
    if (tanggal_lahir !== undefined) updates.tanggal_lahir = tanggal_lahir;
    if (jenis_kelamin !== undefined) updates.jenis_kelamin = jenis_kelamin;
    if (no_telepon !== undefined) updates.no_telepon = no_telepon;
    if (alamat !== undefined) updates.alamat = alamat;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", id);
    if (profileError) {
      console.error("profiles update error:", profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    // If email changed, update auth user email
    if (email !== undefined) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(id, { email });
      if (authError) {
        console.error("auth update error:", authError);
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // ensure caller is admin
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user: caller },
    } = await serverSupabase.auth.getUser();
    if (!caller)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: callerProfile } = await serverSupabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    // delete user from auth
    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteAuthError) {
      console.error("delete user error:", deleteAuthError);
      return NextResponse.json(
        { error: deleteAuthError.message },
        { status: 500 }
      );
    }

    // profiles entry will be deleted by cascade (auth.users -> profiles) but ensure removal
    await supabaseAdmin.from("profiles").delete().eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
