"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function AdminAsesmenPage() {
  const [asesmen, setAsesmen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAsesmen = async () => {
      const supabase = createClient()

      try {
        const { data } = await supabase
          .from("asesmen")
          .select("*, kelas(name), profiles(full_name)")
          .order("created_at", { ascending: false })

        setAsesmen(data || [])
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Kelola Asesmen</h1>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat asesmen...</p>
        </div>
      ) : asesmen.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Belum ada asesmen di sistem.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {asesmen.map((a) => (
            <Card key={a.id} className="p-6 border-green-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{a.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{a.description}</p>
                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>📝 {a.total_questions} soal</span>
                    <span>✓ Nilai minimum: {a.passing_score}</span>
                    <span>📚 {a.kelas?.name || "N/A"}</span>
                    <span>👨‍🏫 {a.profiles?.full_name || "N/A"}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
