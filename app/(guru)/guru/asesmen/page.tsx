"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClipboardList, Plus, Edit, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function GuruAsesmenPage() {
  const [asesmen, setAsesmen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: "", description: "", total_questions: 0, passing_score: 70 })

  useEffect(() => {
    const fetchAsesmen = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      try {
        const { data } = await supabase
          .from("asesmen")
          .select("*")
          .eq("created_by", user.id)
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

  const handleAddAsesmen = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      const { data: newAsesmen, error } = await supabase
        .from("asesmen")
        .insert({
          title: formData.title,
          description: formData.description,
          total_questions: formData.total_questions,
          passing_score: formData.passing_score,
          created_by: user.id,
          kelas_id: "00000000-0000-0000-0000-000000000000",
        })
        .select()

      if (error) throw error

      setAsesmen([newAsesmen[0], ...asesmen])
      setFormData({ title: "", description: "", total_questions: 0, passing_score: 70 })
      setShowForm(false)
    } catch (error) {
      console.error("Error adding asesmen:", error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kelola Asesmen</h1>
        <Button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 gap-2">
          <Plus size={20} />
          Tambah Asesmen
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-green-100 mb-8">
          <form onSubmit={handleAddAsesmen} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Judul Asesmen</label>
              <Input
                type="text"
                placeholder="Masukkan judul asesmen"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="border-green-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
              <Input
                type="text"
                placeholder="Masukkan deskripsi asesmen"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-green-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Soal</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.total_questions}
                  onChange={(e) => setFormData({ ...formData, total_questions: Number.parseInt(e.target.value) })}
                  className="border-green-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Minimum</label>
                <Input
                  type="number"
                  placeholder="70"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: Number.parseInt(e.target.value) })}
                  className="border-green-200"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Simpan
              </Button>
              <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="border-green-200">
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat asesmen...</p>
        </div>
      ) : asesmen.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <ClipboardList size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Belum ada asesmen. Tambahkan asesmen baru untuk memulai.</p>
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
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-400 text-yellow-600 hover:bg-yellow-50 bg-transparent"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-400 text-red-600 hover:bg-red-50 bg-transparent"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
