"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, ClipboardList, Target, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function GuruDashboard() {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalKelas: 0,
    totalMateri: 0,
    totalAsesmen: 0,
    totalPjbl: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      try {
        const [kelasRes, materiRes, asesmenRes, pjblRes] = await Promise.all([
          supabase.from("kelas").select("*", { count: "exact" }).eq("guru_id", user.id),
          supabase.from("materi").select("*", { count: "exact" }).eq("created_by", user.id),
          supabase.from("asesmen").select("*", { count: "exact" }).eq("created_by", user.id),
          supabase.from("pjbl").select("*", { count: "exact" }).eq("created_by", user.id),
        ])

        // Count total students
        const { count: totalSiswa } = await supabase
          .from("kelas_siswa")
          .select("*", { count: "exact" })
          .in("kelas_id", kelasRes.data?.map((k) => k.id) || [])

        setStats({
          totalSiswa: totalSiswa || 0,
          totalKelas: kelasRes.count || 0,
          totalMateri: materiRes.count || 0,
          totalAsesmen: asesmenRes.count || 0,
          totalPjbl: pjblRes.count || 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { label: "Total Siswa", value: stats.totalSiswa, icon: Users, color: "bg-green-100 text-green-600" },
    { label: "Total Kelas", value: stats.totalKelas, icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Total Materi", value: stats.totalMateri, icon: BookOpen, color: "bg-purple-100 text-purple-600" },
    { label: "Total Asesmen", value: stats.totalAsesmen, icon: ClipboardList, color: "bg-yellow-100 text-yellow-600" },
    { label: "Total PjBL", value: stats.totalPjbl, icon: Target, color: "bg-red-100 text-red-600" },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Guru</h1>
        <Link href="/guru/materi">
          <Button className="bg-green-600 hover:bg-green-700 gap-2">
            <Plus size={20} />
            Tambah Materi
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label} className="p-6 border-green-100">
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
                    <Icon size={24} />
                  </div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </Card>
              )
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 border-green-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Akses Cepat</h2>
              <div className="space-y-3">
                <Link href="/guru/materi">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <BookOpen size={20} className="mr-2" />
                    Kelola Materi
                  </Button>
                </Link>
                <Link href="/guru/asesmen">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <ClipboardList size={20} className="mr-2" />
                    Kelola Asesmen
                  </Button>
                </Link>
                <Link href="/guru/pjbl">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <Target size={20} className="mr-2" />
                    Kelola PjBL
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6 border-green-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Informasi</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <p>✓ Kelola materi pembelajaran untuk kelas Anda</p>
                <p>✓ Buat dan kelola asesmen online</p>
                <p>✓ Pantau proyek pembelajaran berbasis masalah</p>
                <p>✓ Lihat nilai dan progress siswa</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
