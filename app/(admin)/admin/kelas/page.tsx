"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Kelas {
  id: string;
  name: string;
  wali_kelas_id: string | null;
  wali_kelas?: { full_name: string; email?: string };
  created_at: string;
}

interface GuruOption {
  id: string;
  full_name: string;
  email: string;
}

export default function AdminKelasPage() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [guruOptions, setGuruOptions] = useState<GuruOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    wali_kelas_id: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchKelas();
    fetchGuru();
  }, []);

  const fetchKelas = async () => {
    setLoading(true);

    try {
      // Fetch kelas data
      const kelasResponse = await fetch("/api/admin/kelas");
      const kelasResult = await kelasResponse.json();

      if (!kelasResult.data) {
        throw new Error("Failed to fetch kelas");
      }

      console.log("✅ Kelas data fetched:", kelasResult.data);
      setKelas(kelasResult.data);
    } catch (error) {
      console.error("❌ Error fetching kelas:", error);
      toast.error("Gagal memuat data kelas");
    } finally {
      setLoading(false);
    }
  };

  const fetchGuru = async () => {
    try {
      const response = await fetch("/api/admin/guru");
      const result = await response.json();

      if (result.data) {
        setGuruOptions(result.data);
      }
    } catch (error) {
      console.error("Error fetching guru:", error);
      toast.error("Gagal memuat data guru");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      await handleUpdateKelas();
    } else {
      await handleAddKelas();
    }
  };

  const handleAddKelas = async () => {
    try {
      const response = await fetch("/api/admin/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          wali_kelas_id: formData.wali_kelas_id || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add kelas");
      }

      // Refresh the entire kelas list to get updated wali kelas info
      await fetchKelas();

      setFormData({ id: "", name: "", wali_kelas_id: "" });
      setShowForm(false);
      toast.success("Kelas berhasil ditambahkan");
    } catch (error: any) {
      console.error("Error adding kelas:", error);
      toast.error(error.message || "Gagal menambahkan kelas");
    }
  };

  const handleUpdateKelas = async () => {
    try {
      const response = await fetch("/api/admin/kelas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          wali_kelas_id: formData.wali_kelas_id || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update kelas");
      }

      // Refresh the entire kelas list to get updated wali kelas info
      await fetchKelas();

      setFormData({ id: "", name: "", wali_kelas_id: "" });
      setShowForm(false);
      setIsEditing(false);
      toast.success("Kelas berhasil diupdate");
    } catch (error: any) {
      console.error("Error updating kelas:", error);
      toast.error(error.message || "Gagal mengupdate kelas");
    }
  };

  const handleDeleteKelas = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini?")) return;

    try {
      const response = await fetch(`/api/admin/kelas?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete kelas");
      }

      setKelas(kelas.filter((k) => k.id !== id));
      toast.success("Kelas berhasil dihapus");
    } catch (error: any) {
      console.error("Error deleting kelas:", error);
      toast.error(error.message || "Gagal menghapus kelas");
    }
  };

  const openEditForm = (kelasItem: Kelas) => {
    setFormData({
      id: kelasItem.id,
      name: kelasItem.name,
      wali_kelas_id: kelasItem.wali_kelas_id || "",
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const openAddForm = () => {
    setFormData({ id: "", name: "", wali_kelas_id: "" });
    setIsEditing(false);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kelola Kelas</h1>
        <Button
          onClick={openAddForm}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <Plus size={20} />
          Tambah Kelas
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Kelas" : "Tambah Kelas"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Kelas
              </label>
              <Input
                type="text"
                placeholder="Contoh: X-A, XI IPA 1, XII IPS 2"
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
                Wali Kelas
              </label>
              <select
                value={formData.wali_kelas_id}
                onChange={(e) =>
                  setFormData({ ...formData, wali_kelas_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Pilih Wali Kelas (Opsional)</option>
                {guruOptions.map((guru) => (
                  <option key={guru.id} value={guru.id}>
                    {guru.full_name} ({guru.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {isEditing ? "Update" : "Simpan"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsEditing(false);
                }}
                variant="outline"
                className="border-green-200"
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat kelas...</p>
        </div>
      ) : kelas.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            Belum ada kelas. Tambahkan kelas baru untuk memulai.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {kelas.map((k) => (
            <Card
              key={k.id}
              className="p-6 border-green-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {k.name}
                  </h3>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>
                      Wali Kelas:{" "}
                      <span className="font-medium text-gray-700">
                        {k.wali_kelas?.full_name ||
                          k.wali_kelas?.email ||
                          "Belum ditentukan"}
                      </span>
                    </span>
                    <span>
                      Dibuat:{" "}
                      {new Date(k.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditForm(k)}
                    className="border-yellow-400 text-yellow-600 hover:bg-yellow-50 bg-transparent"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteKelas(k.id)}
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
  );
}
