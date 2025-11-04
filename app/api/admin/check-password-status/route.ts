import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      );
    }

    // Get user metadata to check if password has been changed
    // Kita akan menggunakan user_metadata field 'password_changed_at'
    const results = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const { data: targetUser, error } =
            await supabase.auth.admin.getUserById(userId);

          if (error || !targetUser) {
            return {
              id: userId,
              passwordChanged: false,
              lastPasswordChange: null,
            };
          }

          // Check if user has user_metadata.password_changed_at
          const passwordChangedAt =
            targetUser.user.user_metadata?.password_changed_at;
          const hasChanged = !!passwordChangedAt;

          return {
            id: userId,
            passwordChanged: hasChanged,
            lastPasswordChange: passwordChangedAt || null,
          };
        } catch (err) {
          console.error(`Error checking password status for ${userId}:`, err);
          return {
            id: userId,
            passwordChanged: false,
            lastPasswordChange: null,
            error: "Failed to check status",
          };
        }
      })
    );

    const response = NextResponse.json({ results });

    // Add no-cache headers
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error: any) {
    console.error("Error checking password status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
