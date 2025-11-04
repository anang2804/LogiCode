import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for reset-passwords API"
  );
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
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
    const { ids } = body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    const results: Array<{
      id: string;
      email?: string;
      temporaryPassword?: string;
      error?: string;
    }> = [];

    for (const id of ids) {
      try {
        const generatedPassword = randomBytes(9)
          .toString("base64")
          .replace(/\/+=|\/+|\+/g, "A")
          .slice(0, 12);

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          {
            password: generatedPassword,
          }
        );

        if (error) {
          console.error("updateUserById error for", id, error);
          results.push({ id, error: error.message });
          continue;
        }

        // fetch profile to get email
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", id)
          .maybeSingle();
        const email = (profile as any)?.email;

        // Store temporary password in profiles table
        try {
          await supabaseAdmin
            .from("profiles")
            .update({
              current_password: generatedPassword,
              password_updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        } catch (e) {
          console.error("Failed to store password in profile:", e);
          // non-fatal
        }

        results.push({ id, email, temporaryPassword: generatedPassword });
      } catch (err: any) {
        console.error("Failed to reset password for", id, err);
        results.push({ id, error: String(err?.message || err) });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
