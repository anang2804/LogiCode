import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function checkAdminAuth() {
  const serverSupabase = await createServerClient();
  const {
    data: { user: caller },
  } = await serverSupabase.auth.getUser();

  if (!caller) throw new Error("Unauthorized");

  const { data: callerProfile } = await serverSupabase
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin") throw new Error("Forbidden");

  return caller;
}

export async function GET(req: Request) {
  try {
    await checkAdminAuth();

    // Fetch kelas with service role (bypass RLS)
    const { data: kelasData, error: kelasError } = await supabaseAdmin
      .from("kelas")
      .select("*")
      .order("name", { ascending: true });

    if (kelasError) throw kelasError;

    // Fetch wali kelas info for each kelas
    const kelasWithWali = await Promise.all(
      (kelasData || []).map(async (k) => {
        if (k.wali_kelas_id) {
          const { data: waliKelas } = await supabaseAdmin
            .from("profiles")
            .select("full_name, email")
            .eq("id", k.wali_kelas_id)
            .maybeSingle();

          return { ...k, wali_kelas: waliKelas };
        }
        return k;
      })
    );

    return NextResponse.json({ data: kelasWithWali || [] });
  } catch (err: any) {
    console.error("Error fetching kelas:", err);
    const status =
      err.message === "Unauthorized"
        ? 401
        : err.message === "Forbidden"
        ? 403
        : 500;
    return NextResponse.json(
      { error: err.message || "Failed to fetch kelas" },
      { status }
    );
  }
}

export async function POST(req: Request) {
  try {
    await checkAdminAuth();

    const body = await req.json();
    const { name, wali_kelas_id } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("kelas")
      .insert({
        name,
        wali_kelas_id: wali_kelas_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("Error creating kelas:", err);
    const status =
      err.message === "Unauthorized"
        ? 401
        : err.message === "Forbidden"
        ? 403
        : 500;
    return NextResponse.json(
      { error: err.message || "Failed to create kelas" },
      { status }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await checkAdminAuth();

    const body = await req.json();
    const { id, name, wali_kelas_id } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID and name are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("kelas")
      .update({
        name,
        wali_kelas_id: wali_kelas_id || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("Error updating kelas:", err);
    const status =
      err.message === "Unauthorized"
        ? 401
        : err.message === "Forbidden"
        ? 403
        : 500;
    return NextResponse.json(
      { error: err.message || "Failed to update kelas" },
      { status }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await checkAdminAuth();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("kelas").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting kelas:", err);
    const status =
      err.message === "Unauthorized"
        ? 401
        : err.message === "Forbidden"
        ? 403
        : 500;
    return NextResponse.json(
      { error: err.message || "Failed to delete kelas" },
      { status }
    );
  }
}
