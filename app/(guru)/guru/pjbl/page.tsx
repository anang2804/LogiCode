"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Target, Plus, Edit, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function GuruPjblPage() {
  const [pjbl, setPjbl] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: "", description: "", start_date: "", end_date: "" })

  useEffect(() => {
    const fetchPjbl = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      try {
        const { data } = await supabase
          .from("pjbl")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false })

        setPjbl(data || [])
      } catch (error) {
        console.error("Error fetching pjbl:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPjbl()
  }, [])

  const handleAddPjbl = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      const { data: newPjbl, error } = await supabase
        .from("pjbl")
        .insert({
          title: formData.title,
          description: formData.description,
          start_date: formData.start_date,
          end_date: formData.end_date,
          created_by: user.id,
          kelas_id: "00000000-0000-0000-0000-000000000000",
        })
        .select()

      if (error) throw error

      setPjbl([newPjbl[0], ...pjbl])
      setFormData({ title: "", description: "", start_date: "", end_date: "" })
      setShowForm(false)
    } catch (error) {
      console.error("Error adding pjbl:", error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kelola PjBL</h1>
        <Button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 gap-2">
          <Plus size={20} />
          Tambah PjBL
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-green-100 mb-8">
          <form onSubmit={handleAddPjbl} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Judul Proyek</label>
              <Input
                type="text"
                placeholder="Masukkan judul proyek"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="border-green-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
              <textarea
                placeholder="Masukkan deskripsi proyek"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="border-green-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
          <p className="text-gray-600">Memuat proyek...</p>
        </div>
      ) : pjbl.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <Target size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Belum ada proyek PjBL. Tambahkan proyek baru untuk memulai.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pjbl.map((p) => (
            <Card key={p.id} className="p-6 border-green-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{p.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{p.description}</p>
                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>📅 Mulai: {new Date(p.start_date).toLocaleDateString("id-ID")}</span>
                    <span>📅 Selesai: {new Date(p.end_date).toLocaleDateString("id-ID")}</span>
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
