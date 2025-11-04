"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function GuruNilaiPage() {
  const [nilai, setNilai] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNilai = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      try {
        const { data } = await supabase
          .from("nilai")
          .select("*, asesmen(title), profiles(full_name)")
          .order("created_at", { ascending: false })

        setNilai(data || [])
      } catch (error) {
        console.error("Error fetching nilai:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNilai()
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Kelola Nilai</h1>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat nilai...</p>
        </div>
      ) : nilai.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Belum ada nilai yang dicatat.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-green-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Siswa</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Asesmen</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Nilai</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {nilai.map((n) => (
                <tr key={n.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-900">{n.profiles?.full_name || "N/A"}</td>
                  <td className="py-3 px-4 text-gray-600">{n.asesmen?.title || "N/A"}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-green-600">{n.score}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        n.status === "lulus" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {n.status === "lulus" ? "Lulus" : "Tidak Lulus"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-sm">
                    {new Date(n.created_at).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
