"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, Plus, Edit, Trash2, Eye, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Materi {
  id: string;
  title: string;
  description: string;
  content: string;
  mapel_id?: string;
  mapel?: { id: string; name: string };
  profiles?: { full_name: string };
  thumbnail_url?: string;
  duration?: number;
  difficulty?: string;
  total_lessons?: number;
  is_published?: boolean;
  kelas?: string[];
  created_at: string;
}

interface Bab {
  id: string;
  materi_id: string;
  title: string;
  description?: string;
  order_index: number;
  total_lessons?: number;
}

interface SubBab {
  id: string;
  bab_id: string;
  title: string;
  content?: string;
  content_type: string;
  content_url?: string;
  duration?: number;
  order_index: number;
  is_prerequisite?: boolean;
}

interface MapelOption {
  id: string;
  name: string;
}

interface KelasOption {
  id: string;
  name: string;
}

export default function AdminMateriPage() {
  const [materi, setMateri] = useState<Materi[]>([]);
  const [mapelOptions, setMapelOptions] = useState<MapelOption[]>([]);
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedMateri, setSelectedMateri] = useState<Materi | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    content: "",
    mapel_id: "",
    thumbnail_url: "",
    duration: 0,
    difficulty: "beginner",
    total_lessons: 1,
    is_published: true,
    kelas: [] as string[],
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchMateri();
    fetchMapel();
    fetchKelas();
  }, []);

  // Fungsi untuk mengkompresi gambar
  const compressImage = (
    file: File,
    maxWidth = 800,
    quality = 0.7
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Resize jika lebih besar dari maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Gagal membuat canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Kompresi dengan quality (0.7 = 70%)
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error("Gagal memuat gambar"));
      };
      reader.onerror = () => reject(new Error("Gagal membaca file"));
    });
  };

  const fetchMateri = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch materi data first
      const { data: materiData, error: materiError } = await supabase
        .from("materi")
        .select("*")
        .order("created_at", { ascending: false });

      if (materiError) {
        console.error("Error fetching materi:", materiError);
        toast.error(`Gagal memuat materi: ${materiError.message}`);
        setMateri([]);
        return;
      }

      // Fetch related data separately
      if (materiData && materiData.length > 0) {
        const mapelIds = [
          ...new Set(materiData.map((m) => m.mapel_id).filter(Boolean)),
        ];
        const creatorIds = [
          ...new Set(materiData.map((m) => m.created_by).filter(Boolean)),
        ];

        // Fetch mapel data
        const { data: mapelData } = await supabase
          .from("mapel")
          .select("id, name")
          .in("id", mapelIds);

        // Fetch profiles data
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds);

        // Merge data
        const enrichedData = materiData.map((materi) => ({
          ...materi,
          mapel: mapelData?.find((m) => m.id === materi.mapel_id) || null,
          profiles:
            profilesData?.find((p) => p.id === materi.created_by) || null,
        }));

        setMateri(enrichedData);
      } else {
        setMateri([]);
      }
    } catch (err) {
      console.error("Error fetching materi:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Gagal memuat materi";
      toast.error(errorMessage);
      setMateri([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapel = async () => {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("mapel")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching mapel:", error);
        toast.error(`Gagal memuat mata pelajaran: ${error.message}`);
        throw error;
      }
      setMapelOptions(data || []);
    } catch (err) {
      console.error("Error fetching mapel:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Gagal memuat mata pelajaran";
      toast.error(errorMessage);
    }
  };

  const fetchKelas = async () => {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("kelas")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching kelas:", error);
        toast.error(`Gagal memuat kelas: ${error.message}`);
        throw error;
      }
      setKelasOptions(data || []);
    } catch (err) {
      console.error("Error fetching kelas:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Gagal memuat kelas";
      toast.error(errorMessage);
    }
  };

  const handleAddMateri = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("User tidak ditemukan");
        return;
      }

      // Insert data without join first
      const { data: newMateri, error } = await supabase
        .from("materi")
        .insert({
          title: formData.title,
          mapel_id: formData.mapel_id || null,
          description: formData.description,
          thumbnail_url: formData.thumbnail_url || null,
          kelas: formData.kelas.length > 0 ? formData.kelas : null,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error details:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        throw error;
      }

      // Fetch full data with relations after successful insert
      if (newMateri) {
        const { data: fullMateri } = await supabase
          .from("materi")
          .select(
            `
            *,
            mapel:mapel_id(id, name),
            profiles:created_by(full_name)
          `
          )
          .eq("id", newMateri.id)
          .single();

        setMateri([fullMateri || newMateri, ...materi]);
      }
      setFormData({
        id: "",
        title: "",
        description: "",
        content: "",
        mapel_id: "",
        thumbnail_url: "",
        duration: 0,
        difficulty: "beginner",
        total_lessons: 1,
        is_published: true,
        kelas: [],
      });
      setShowForm(false);
      toast.success("Materi berhasil ditambahkan");
    } catch (err) {
      console.error("Error adding materi:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Gagal menambahkan materi";
      toast.error(errorMessage);
    }
  };

  const handleUpdateMateri = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    try {
      // Update data without join first
      const { data: updatedMateri, error } = await supabase
        .from("materi")
        .update({
          title: formData.title,
          description: formData.description,
          mapel_id: formData.mapel_id || null,
          thumbnail_url: formData.thumbnail_url || null,
          kelas: formData.kelas.length > 0 ? formData.kelas : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.id)
        .select()
        .single();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      // Fetch full data with relations after successful update
      if (updatedMateri) {
        // Fetch mapel
        let mapelData = null;
        if (updatedMateri.mapel_id) {
          const { data: mapel } = await supabase
            .from("mapel")
            .select("id, name")
            .eq("id", updatedMateri.mapel_id)
            .single();
          mapelData = mapel;
        }

        // Fetch profile
        let profileData = null;
        if (updatedMateri.created_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", updatedMateri.created_by)
            .single();
          profileData = profile;
        }

        const enrichedMateri = {
          ...updatedMateri,
          mapel: mapelData,
          profiles: profileData,
        };

        setMateri(
          materi.map((m) => (m.id === formData.id ? enrichedMateri : m))
        );
      }
      setFormData({
        id: "",
        title: "",
        description: "",
        content: "",
        mapel_id: "",
        thumbnail_url: "",
        duration: 0,
        difficulty: "beginner",
        total_lessons: 1,
        is_published: true,
        kelas: [],
      });
      setShowForm(false);
      setIsEditing(false);
      toast.success("Materi berhasil diupdate");
    } catch (err) {
      console.error("Error updating materi:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Gagal mengupdate materi";
      toast.error(errorMessage);
    }
  };

  const handleDeleteMateri = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus materi ini?")) return;

    const supabase = createClient();

    try {
      const { error } = await supabase.from("materi").delete().eq("id", id);

      if (error) throw error;

      setMateri(materi.filter((m) => m.id !== id));
      toast.success("Materi berhasil dihapus");
    } catch (err) {
      console.error("Error deleting materi:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Gagal menghapus materi";
      toast.error(errorMessage);
    }
  };

  const openEditForm = (materiItem: Materi) => {
    setFormData({
      id: materiItem.id,
      title: materiItem.title,
      description: materiItem.description,
      content: materiItem.content,
      mapel_id: materiItem.mapel_id || "",
      thumbnail_url: materiItem.thumbnail_url || "",
      duration: 0,
      difficulty: "beginner",
      total_lessons: 1,
      is_published: true,
      kelas: materiItem.kelas || [],
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const openAddForm = () => {
    setFormData({
      id: "",
      title: "",
      description: "",
      content: "",
      mapel_id: "",
      thumbnail_url: "",
      duration: 0,
      difficulty: "beginner",
      total_lessons: 1,
      is_published: true,
      kelas: [],
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const viewDetail = (materiItem: Materi) => {
    setSelectedMateri(materiItem);
    setShowDetail(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kelola Materi</h1>
        <Button
          onClick={openAddForm}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <Plus size={20} />
          Tambah Materi
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Materi" : "Tambah Materi"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={isEditing ? handleUpdateMateri : handleAddMateri}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul Materi
              </label>
              <Input
                type="text"
                placeholder="Contoh: Pengenalan React"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="border-green-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mata Pelajaran
              </label>
              <select
                value={formData.mapel_id}
                onChange={(e) =>
                  setFormData({ ...formData, mapel_id: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Pilih Mata Pelajaran</option>
                {mapelOptions.map((mapel) => (
                  <option key={mapel.id} value={mapel.id}>
                    {mapel.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kelas (Opsional - Pilih kelas yang dapat mengakses materi ini)
              </label>
              <div className="border border-green-200 rounded-md p-3 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {kelasOptions.map((kelas) => (
                    <label
                      key={kelas.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.kelas.includes(kelas.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              kelas: [...formData.kelas, kelas.name],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              kelas: formData.kelas.filter(
                                (k) => k !== kelas.name
                              ),
                            });
                          }
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm">{kelas.name}</span>
                    </label>
                  ))}
                </div>
                {formData.kelas.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Tidak ada kelas dipilih = Semua kelas dapat mengakses
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi Singkat
              </label>
              <Textarea
                placeholder="Deskripsi singkat tentang materi ini"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                className="border-green-200 min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Sampul
              </label>
              <div className="border-2 border-dashed border-green-200 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        // Cek ukuran file
                        const fileSizeInMB = file.size / (1024 * 1024);
                        toast.info(
                          `Mengkompresi gambar (${fileSizeInMB.toFixed(
                            2
                          )}MB)...`
                        );

                        // Kompresi gambar (max 800px lebar, quality 70%)
                        const compressedImage = await compressImage(
                          file,
                          800,
                          0.7
                        );

                        // Hitung ukuran setelah kompresi
                        const compressedSizeInMB =
                          (compressedImage.length * 0.75) / (1024 * 1024);
                        toast.success(
                          `Gambar berhasil dikompres menjadi ${compressedSizeInMB.toFixed(
                            2
                          )}MB`
                        );

                        setFormData({
                          ...formData,
                          thumbnail_url: compressedImage,
                        });
                      } catch (error) {
                        console.error("Error kompres gambar:", error);
                        toast.error("Gagal mengkompresi gambar");
                      }
                    }
                  }}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {formData.thumbnail_url ? (
                    <div className="relative">
                      <img
                        src={formData.thumbnail_url}
                        alt="Preview"
                        className="max-h-40 rounded-lg object-cover"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Klik untuk mengganti gambar
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Klik untuk upload gambar
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG hingga 5MB
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
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

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <DialogTitle className="text-2xl">
                {selectedMateri?.title}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetail(false)}
                className="h-8 w-8 p-0"
              >
                <X size={20} />
              </Button>
            </div>
          </DialogHeader>
          {selectedMateri && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm text-gray-500 flex-wrap">
                <span>📚 {selectedMateri.mapel?.name || "N/A"}</span>
                <span>👨‍🏫 {selectedMateri.profiles?.full_name || "N/A"}</span>
                <span>
                  📅{" "}
                  {new Date(selectedMateri.created_at).toLocaleDateString(
                    "id-ID"
                  )}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Deskripsi:</h3>
                <p className="text-gray-600">{selectedMateri.description}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Konten Materi:
                </h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selectedMateri.content}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat materi...</p>
        </div>
      ) : materi.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            Belum ada materi. Tambahkan materi baru untuk memulai.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {materi.map((m) => (
            <Card
              key={m.id}
              className="p-6 border-green-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {m.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {m.description}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500 flex-wrap items-center">
                    <span>📚 {m.mapel?.name || "N/A"}</span>
                    <span>👨‍🏫 {m.profiles?.full_name || "N/A"}</span>
                    <span>
                      📅 {new Date(m.created_at).toLocaleDateString("id-ID")}
                    </span>
                    {m.kelas && m.kelas.length > 0 ? (
                      <span className="flex items-center gap-1">
                        🎓
                        <span className="text-green-700 font-medium">
                          {m.kelas.join(", ")}
                        </span>
                      </span>
                    ) : (
                      <span className="text-blue-600">🌐 Semua Kelas</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      (window.location.href = `/admin/materi/${m.id}`)
                    }
                    className="border-green-400 text-green-600 hover:bg-green-50 bg-transparent"
                    title="Kelola Bab & Sub Bab"
                  >
                    <BookOpen size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => viewDetail(m)}
                    className="border-blue-400 text-blue-600 hover:bg-blue-50 bg-transparent"
                    title="Lihat Detail"
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditForm(m)}
                    className="border-yellow-400 text-yellow-600 hover:bg-yellow-50 bg-transparent"
                    title="Edit Materi"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteMateri(m.id)}
                    className="border-red-400 text-red-600 hover:bg-red-50 bg-transparent"
                    title="Hapus Materi"
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
