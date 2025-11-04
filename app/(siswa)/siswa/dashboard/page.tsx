"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardList, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SiswaDashboard() {
  const [stats, setStats] = useState({
    totalKelas: 0,
    totalMateri: 0,
    totalAsesmen: 0,
    totalPjbl: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      try {
        const [kelasRes, materiRes, asesmenRes, pjblRes] = await Promise.all([
          supabase
            .from("kelas_siswa")
            .select("*", { count: "exact" })
            .eq("siswa_id", user.id),
          supabase.from("materi").select("*", { count: "exact" }),
          supabase.from("asesmen").select("*", { count: "exact" }),
          supabase.from("pjbl").select("*", { count: "exact" }),
        ]);

        setStats({
          totalKelas: kelasRes.count || 0,
          totalMateri: materiRes.count || 0,
          totalAsesmen: asesmenRes.count || 0,
          totalPjbl: pjblRes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Siswa</h1>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Kelas Saya</h3>
                <BookOpen className="text-green-600" size={24} />
              </div>
              <p className="text-3xl font-bold text-green-600 mb-4">
                {stats.totalKelas}
              </p>
              <Link href="/siswa/materi">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Lihat Kelas
                </Button>
              </Link>
            </Card>

            <Card className="p-6 border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Asesmen</h3>
                <ClipboardList className="text-green-600" size={24} />
              </div>
              <p className="text-3xl font-bold text-green-600 mb-4">
                {stats.totalAsesmen}
              </p>
              <Link href="/siswa/asesmen">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Mulai Asesmen
                </Button>
              </Link>
            </Card>

            <Card className="p-6 border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Proyek PjBL</h3>
                <Target className="text-green-600" size={24} />
              </div>
              <p className="text-3xl font-bold text-green-600 mb-4">
                {stats.totalPjbl}
              </p>
              <Link href="/siswa/pjbl">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Lihat Proyek
                </Button>
              </Link>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 border-green-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Akses Cepat
              </h2>
              <div className="space-y-3">
                <Link href="/siswa/materi">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <BookOpen size={20} className="mr-2" />
                    Akses Materi
                  </Button>
                </Link>
                <Link href="/siswa/asesmen">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <ClipboardList size={20} className="mr-2" />
                    Ikuti Asesmen
                  </Button>
                </Link>
                <Link href="/siswa/pjbl">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <Target size={20} className="mr-2" />
                    Kerjakan PjBL
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6 border-green-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Informasi
              </h2>
              <div className="space-y-3 text-sm text-gray-600">
                <p>✓ Akses materi pembelajaran dari guru</p>
                <p>✓ Ikuti asesmen online dan lihat nilai</p>
                <p>✓ Kerjakan proyek pembelajaran berbasis masalah</p>
                <p>✓ Pantau progress pembelajaran Anda</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
