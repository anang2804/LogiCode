"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClipboardList, Play } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function SiswaAsesmenPage() {
  const [asesmen, setAsesmen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAsesmen = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      try {
        const { data: kelas } = await supabase.from("kelas_siswa").select("kelas_id").eq("siswa_id", user.id)

        const kelasIds = kelas?.map((k) => k.kelas_id) || []

        if (kelasIds.length > 0) {
          const { data } = await supabase
            .from("asesmen")
            .select("*")
            .in("kelas_id", kelasIds)
            .order("created_at", { ascending: false })

          setAsesmen(data || [])
        }
      } catch (error) {
        console.error("Error fetching asesmen:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAsesmen()
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Akses Asesmen</h1>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat asesmen...</p>
        </div>
      ) : asesmen.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Belum ada asesmen tersedia untuk kelas Anda.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {asesmen.map((a) => (
            <Card key={a.id} className="p-6 border-green-100 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{a.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{a.description}</p>
                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>📝 {a.total_questions} soal</span>
                    <span>✓ Nilai minimum: {a.passing_score}</span>
                  </div>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 gap-2">
                  <Play size={16} />
                  Mulai
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
