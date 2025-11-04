"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  ClipboardList,
  Target,
  Layers,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    totalKelas: 0,
    totalMapel: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      try {
        // Fetch siswa dan guru menggunakan API endpoint untuk lebih reliable
        const siswaReq = fetch("/api/admin/siswa").then((res) => res.json());
        const guruReq = fetch("/api/admin/guru").then((res) => res.json());

        const [siswaData, guruData, kelasRes, mapelRes] = await Promise.all([
          siswaReq,
          guruReq,
          supabase.from("kelas").select("*", { count: "exact" }),
          supabase.from("mapel").select("*", { count: "exact" }),
        ]);

        setStats({
          totalSiswa: siswaData?.data?.length || 0,
          totalGuru: guruData?.data?.length || 0,
          totalKelas: kelasRes.count || 0,
          totalMapel: mapelRes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Siswa",
      value: stats.totalSiswa,
      icon: Users,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Total Guru",
      value: stats.totalGuru,
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Total Kelas",
      value: stats.totalKelas,
      icon: Layers,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Total Mapel",
      value: stats.totalMapel,
      icon: BookOpen,
      color: "bg-yellow-100 text-yellow-600",
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <Link href="/admin/mapel">
          <Button className="bg-green-600 hover:bg-green-700 gap-2">
            <Plus size={20} />
            Tambah Mapel
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-6 border-green-100">
                  <div
                    className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}
                  >
                    <Icon size={24} />
                  </div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </Card>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 border-green-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Manajemen Sistem
              </h2>
              <div className="space-y-3">
                <Link href="/admin/mapel">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <BookOpen size={20} className="mr-2" />
                    Kelola Mata Pelajaran
                  </Button>
                </Link>
                <Link href="/admin/kelas">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <Layers size={20} className="mr-2" />
                    Kelola Kelas
                  </Button>
                </Link>
                <Link href="/admin/guru">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <Users size={20} className="mr-2" />
                    Kelola Guru
                  </Button>
                </Link>
                <Link href="/admin/siswa">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <Users size={20} className="mr-2" />
                    Kelola Siswa
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6 border-green-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Informasi Admin
              </h2>
              <div className="space-y-3 text-sm text-gray-600">
                <p>✓ Kelola semua mata pelajaran di sistem</p>
                <p>✓ Kelola kelas dan penugasan guru</p>
                <p>✓ Kelola data guru dan siswa</p>
                <p>✓ Monitor semua aktivitas pembelajaran</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
