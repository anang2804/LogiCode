import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get ALL profiles with password data
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, current_password, password_updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format response
    const result = profiles?.map((p) => ({
      id: p.id,
      email: p.email,
      name: p.full_name,
      role: p.role,
      has_password: !!p.current_password,
      password_length: p.current_password?.length || 0,
      password_preview: p.current_password
        ? p.current_password.substring(0, 6) + "..."
        : null,
      full_password: p.current_password, // Show full for debugging
      updated_at: p.password_updated_at,
    }));

    return NextResponse.json({
      total: result?.length || 0,
      with_password: result?.filter((r) => r.has_password).length || 0,
      users: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
