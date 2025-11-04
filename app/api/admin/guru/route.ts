import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  // Check admin authentication
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

  // Create new guru
  try {
    const body = await req.json();
    let { email, password: providedPassword, full_name } = body;

    const emailDomain =
      process.env.DEFAULT_GURU_EMAIL_DOMAIN || "guru.smksypm4.my.id";

    const slugify = (name: string) => {
      return name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s.-]/g, "")
        .trim()
        .replace(/\s+/g, ".")
        .replace(/\.+/g, ".");
    };

    const generatedPassword =
      providedPassword ||
      randomBytes(9)
        .toString("base64")
        .replace(/\/+|=+|\+/g, "A")
        .slice(0, 12);

    let created: any = null;
    let createError: any = null;
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let candidateEmail = email;
      if (!candidateEmail) {
        const slug = slugify(full_name || "guru");
        const suffix = attempt > 1 ? randomBytes(2).toString("hex") : "";
        candidateEmail = suffix
          ? `${slug}.${suffix}@${emailDomain}`
          : `${slug}@${emailDomain}`;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: candidateEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {},
      });

      if (!error) {
        created = data;
        email = candidateEmail;
        break;
      }

      createError = error;
      if (error.message?.includes("already") || error.status === 422) {
        if (attempt < maxAttempts) continue;
      }
      break;
    }

    if (!created) {
      throw createError || new Error("Failed to create guru user");
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", created.user.id)
      .single();

    if (existingProfile) {
      // Update existing profile instead of inserting
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          email,
          full_name,
          role: "guru",
        })
        .eq("id", created.user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        throw updateError;
      }
    } else {
      // Insert new profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: created.user.id,
          email,
          full_name,
          role: "guru",
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        throw profileError;
      }
    }

    return NextResponse.json({
      id: created.user.id,
      email,
      full_name,
      temporaryPassword: generatedPassword,
    });
  } catch (err: any) {
    console.error("Error creating guru:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create guru" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  // Check admin authentication
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
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("role", "guru")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    console.error("Error fetching guru:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch guru" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  // Update guru profile (and optionally email)
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
    const { id, email, full_name } = body;
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    // Update profiles table
    const updates: any = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;

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
  } catch (err: any) {
    console.error("Error updating guru:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // Check admin authentication
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

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting guru:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete guru" },
      { status: 500 }
    );
  }
}
