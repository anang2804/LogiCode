import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "password is required" },
        { status: 400 }
      );
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        password_changed_at: new Date().toISOString(),
      },
    });

    if (updateError) {
      throw updateError;
    }

    // Store password in profiles table (for admin viewing)
    const now = new Date().toISOString();

    console.log("💾 Attempting to store password in profiles table:", {
      userId: user.id,
      passwordLength: password.length,
      timestamp: now,
    });

    const { data: updateData, error: profileError } = await supabase
      .from("profiles")
      .update({
        current_password: password,
        password_updated_at: now,
      })
      .eq("id", user.id)
      .select();

    if (profileError) {
      console.error("❌ Error storing password in profile:", {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });

      // Jika error karena kolom tidak ada, beri instruksi
      if (profileError.code === "42703") {
        console.error(
          "⚠️ Column 'current_password' or 'password_updated_at' does not exist!"
        );
        console.error(
          "⚠️ Please run migration: scripts/003_add_password_tracking.sql"
        );
      }
    } else {
      console.log("✅ Password stored in profile successfully:", {
        userId: user.id,
        updatedAt: now,
        rowsUpdated: updateData?.length,
        passwordPreview: password.substring(0, 4) + "...",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
