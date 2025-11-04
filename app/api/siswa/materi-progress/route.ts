import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mark sub_bab as complete/incomplete (untuk siswa)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sub_bab_id, completed } = body;

    if (!sub_bab_id || completed === undefined) {
      return NextResponse.json(
        { error: "sub_bab_id and completed required" },
        { status: 400 }
      );
    }

    // Upsert sub_bab_progress (insert or update)
    // The trigger will automatically recalculate materi_progress
    const { data, error } = await supabase
      .from("sub_bab_progress")
      .upsert(
        {
          siswa_id: user.id,
          sub_bab_id: sub_bab_id,
          completed: completed,
        },
        {
          onConflict: "siswa_id,sub_bab_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating sub_bab progress:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get updated materi progress
    const { data: subBabData } = await supabase
      .from("materi_sub_bab")
      .select("bab_id, materi_bab!inner(materi_id)")
      .eq("id", sub_bab_id)
      .single();

    let materiProgress = null;
    if (subBabData) {
      const materiId = (subBabData as any).materi_bab.materi_id;
      const { data: progressData } = await supabase
        .from("materi_progress")
        .select("*")
        .eq("siswa_id", user.id)
        .eq("materi_id", materiId)
        .single();

      materiProgress = progressData;
    }

    return NextResponse.json({
      ok: true,
      sub_bab_progress: data,
      materi_progress: materiProgress,
    });
  } catch (error: any) {
    console.error("Error in update progress API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Get own progress (untuk siswa)
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const materiId = searchParams.get("materi_id");
    const subBabId = searchParams.get("sub_bab_id");

    if (subBabId) {
      // Get progress for specific sub_bab
      const { data, error } = await supabase
        .from("sub_bab_progress")
        .select("*")
        .eq("siswa_id", user.id)
        .eq("sub_bab_id", subBabId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching sub_bab progress:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data: data || { completed: false } });
    } else if (materiId) {
      // Get progress for specific materi + all sub_bab progress
      const { data: materiProgress, error: materiError } = await supabase
        .from("materi_progress")
        .select("*")
        .eq("siswa_id", user.id)
        .eq("materi_id", materiId)
        .maybeSingle();

      if (materiError && materiError.code !== "PGRST116") {
        console.error("Error fetching materi progress:", materiError);
        return NextResponse.json(
          { error: materiError.message },
          { status: 500 }
        );
      }

      // Get all sub_bab progress for this materi
      const { data: subBabProgress, error: subBabError } = await supabase
        .from("sub_bab_progress")
        .select(
          `
          *,
          materi_sub_bab!inner(
            id,
            bab_id,
            materi_bab!inner(
              materi_id
            )
          )
        `
        )
        .eq("siswa_id", user.id);

      if (subBabError) {
        console.error("Error fetching sub_bab progress:", subBabError);
      }

      // Filter to only this materi
      const filteredSubBab = (subBabProgress || []).filter((sbp: any) => {
        return sbp.materi_sub_bab?.materi_bab?.materi_id === materiId;
      });

      return NextResponse.json({
        materi_progress: materiProgress || null,
        sub_bab_progress: filteredSubBab || [],
      });
    } else {
      // Get all progress for this user
      const { data, error } = await supabase
        .from("materi_progress")
        .select(
          `
          *,
          materi:materi_id (
            id,
            title
          )
        `
        )
        .eq("siswa_id", user.id)
        .order("last_read_at", { ascending: false });

      if (error) {
        console.error("Error fetching progress:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data: data || [] });
    }
  } catch (error: any) {
    console.error("Error in get progress API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
