import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const siswaId = searchParams.get("siswa_id");

    if (!siswaId) {
      return NextResponse.json({ error: "siswa_id required" }, { status: 400 });
    }

    // Get all materi progress for this student
    const { data: progressData, error: progressError } = await supabase
      .from("materi_progress")
      .select(
        `
        id,
        materi_id,
        completed_sub_bab,
        total_sub_bab,
        progress_percentage,
        last_read_at,
        completed_at,
        materi:materi_id (
          id,
          title,
          kelas
        )
      `
      )
      .eq("siswa_id", siswaId)
      .order("last_read_at", { ascending: false });

    if (progressError) {
      console.error("Error fetching progress:", progressError);
      return NextResponse.json(
        { error: progressError.message },
        { status: 500 }
      );
    }

    // Get total count of materi available to this student
    const { data: siswaProfile } = await supabase
      .from("profiles")
      .select("kelas")
      .eq("id", siswaId)
      .single();

    const siswaKelas = siswaProfile?.kelas;

    // Query to get all materi accessible by this student
    let materiQuery = supabase.from("materi").select("id, title, kelas");

    const { data: allMateri, error: materiError } = await materiQuery;

    if (materiError) {
      console.error("Error fetching materi:", materiError);
      return NextResponse.json({ error: materiError.message }, { status: 500 });
    }

    // Filter materi based on kelas (null/empty = all students, or includes student's kelas)
    const accessibleMateri = (allMateri || []).filter((m: any) => {
      if (!m.kelas || m.kelas.length === 0) return true; // Available to all
      if (!siswaKelas) return false; // Student has no kelas
      return m.kelas.includes(siswaKelas);
    });

    // Calculate overall statistics
    const totalMateri = accessibleMateri.length;
    const materiWithProgress = progressData?.length || 0;
    const completedMateri =
      progressData?.filter((p) => p.progress_percentage === 100).length || 0;

    const averageProgress =
      totalMateri > 0
        ? Math.round(
            (progressData?.reduce(
              (sum, p) => sum + (p.progress_percentage || 0),
              0
            ) || 0) / totalMateri
          )
        : 0;

    return NextResponse.json({
      siswa_id: siswaId,
      kelas: siswaKelas,
      total_materi: totalMateri,
      materi_read: materiWithProgress,
      materi_completed: completedMateri,
      average_progress: averageProgress,
      progress: progressData || [],
      accessible_materi: accessibleMateri,
    });
  } catch (error: any) {
    console.error("Error in materi progress API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
