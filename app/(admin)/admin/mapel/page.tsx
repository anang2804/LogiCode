"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Plus, Edit, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminMapelPage() {
  const [mapel, setMapel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMapel = async () => {
      const supabase = createClient();

      try {
        const { data } = await supabase
          .from("mapel")
          .select("*")
          .order("created_at", { ascending: false });

        setMapel(data || []);
      } catch (error) {
        console.error("Error fetching mapel:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMapel();
  }, []);

  const handleAddMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    try {
      if (editingId) {
        // Update existing mapel
        const { data: updatedMapel, error } = await supabase
          .from("mapel")
          .update({
            name: formData.name,
            code: formData.code,
            description: formData.description,
          })
          .eq("id", editingId)
          .select();

        if (error) throw error;

        setMapel(mapel.map((m) => (m.id === editingId ? updatedMapel[0] : m)));
        setEditingId(null);
      } else {
        // Insert new mapel
        const { data: newMapel, error } = await supabase
          .from("mapel")
          .insert({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            created_by: user.id,
          })
          .select();

        if (error) throw error;

        setMapel([newMapel[0], ...mapel]);
      }

      setFormData({ name: "", code: "", description: "" });
      setShowForm(false);
    } catch (error) {
      console.error("Error adding/updating mapel:", error);
    }
  };

  const handleEditMapel = (mapelItem: any) => {
    setFormData({
      name: mapelItem.name,
      code: mapelItem.code,
      description: mapelItem.description || "",
    });
    setEditingId(mapelItem.id);
    setShowForm(true);
  };

  const handleDeleteMapel = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?"))
      return;

    const supabase = createClient();

    try {
      const { error } = await supabase.from("mapel").delete().eq("id", id);

      if (error) throw error;

      setMapel(mapel.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Error deleting mapel:", error);
      alert("Gagal menghapus mata pelajaran. Pastikan tidak ada data terkait.");
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormData({ name: "", code: "", description: "" });
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Kelola Mata Pelajaran
        </h1>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              setFormData({ name: "", code: "", description: "" });
              setEditingId(null);
            }
          }}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <Plus size={20} />
          Tambah Mapel
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-green-100 mb-8">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
          </h2>
          <form onSubmit={handleAddMapel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Mata Pelajaran
              </label>
              <Input
                type="text"
                placeholder="Contoh: Matematika"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="border-green-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kode Mapel
              </label>
              <Input
                type="text"
                placeholder="Contoh: MTK"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                required
                className="border-green-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi
              </label>
              <Input
                type="text"
                placeholder="Deskripsi mata pelajaran"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="border-green-200"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {editingId ? "Update" : "Simpan"}
              </Button>
              <Button
                type="button"
                onClick={handleCancelForm}
                variant="outline"
                className="border-green-200"
              >
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat mata pelajaran...</p>
        </div>
      ) : mapel.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            Belum ada mata pelajaran. Tambahkan mata pelajaran baru untuk
            memulai.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mapel.map((m) => (
            <Card key={m.id} className="p-6 border-green-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      {m.name}
                    </h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      {m.code}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-2">{m.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-400 text-yellow-600 hover:bg-yellow-50 bg-transparent"
                    onClick={() => handleEditMapel(m)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-400 text-red-600 hover:bg-red-50 bg-transparent"
                    onClick={() => handleDeleteMapel(m.id)}
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
  );
}
