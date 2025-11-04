import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get stored password from profiles table (bypass RLS)
    console.log("🔍 Fetching password from DB for userId:", userId);

    const { data: userData, error } = await supabaseAdmin
      .from("profiles")
      .select("current_password, password_updated_at, email, full_name")
      .eq("id", userId)
      .maybeSingle(); // Use maybeSingle to handle no data gracefully

    console.log("📊 Query result:", {
      found: !!userData,
      error: error?.message,
      email: userData?.email,
      name: userData?.full_name,
      hasPassword: !!userData?.current_password,
      passwordValue: userData?.current_password,
      updatedAt: userData?.password_updated_at,
    });

    if (error) {
      console.error("❌ Error fetching user password:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // If no user data found, return null password (not an error)
    if (!userData) {
      console.log("⚠️ No profile found for user:", userId);
      return NextResponse.json({
        password: null,
        updatedAt: null,
      });
    }

    console.log(
      "✅ Returning password for user:",
      userId,
      userData?.current_password
    );

    const response = NextResponse.json({
      password: userData?.current_password || null,
      updatedAt: userData?.password_updated_at || null,
    });

    // Add no-cache headers
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error: any) {
    console.error("Error getting user password:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
