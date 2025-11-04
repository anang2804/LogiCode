"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Mail,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  User,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Siswa {
  id: string;
  email: string;
  full_name: string;
  kelas?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: string;
  no_telepon?: string;
  alamat?: string;
  created_at: string;
}

interface KelasOption {
  id: string;
  name: string;
}

interface MateriProgress {
  siswa_id: string;
  kelas?: string;
  total_materi: number;
  materi_read: number;
  materi_completed: number;
  average_progress: number;
  progress: Array<{
    id: string;
    materi_id: string;
    completed_sub_bab: number;
    total_sub_bab: number;
    progress_percentage: number;
    last_read_at: string;
    completed_at?: string;
    materi: {
      id: string;
      title: string;
      kelas: string[];
    };
  }>;
}

export default function AdminSiswaPage() {
  const supabase = createClient();
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [filteredSiswa, setFilteredSiswa] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Siswa>>({});
  const [saving, setSaving] = useState(false);
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);

  // Add form state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: "",
    email: "",
    kelas: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Progress state
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<MateriProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Filter state
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>("all");

  useEffect(() => {
    fetchSiswa();
    fetchKelas();
  }, []);

  useEffect(() => {
    filterSiswa();
  }, [searchTerm, siswa, selectedKelasFilter]);

  async function fetchSiswa() {
    try {
      const response = await fetch("/api/admin/siswa");
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to fetch siswa");
      }

      setSiswa(json.data || []);
      setFilteredSiswa(json.data || []);
    } catch (err: any) {
      console.error("Error fetching siswa:", err);
      toast.error(err.message || "Gagal memuat data siswa");
    } finally {
      setLoading(false);
    }
  }

  async function fetchKelas() {
    try {
      const { data, error } = await supabase
        .from("kelas")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setKelasOptions(data || []);
    } catch (err: any) {
      console.error("Error fetching kelas:", err);
    }
  }

  function filterSiswa() {
    let filtered = [...siswa];

    // Filter by kelas
    if (selectedKelasFilter !== "all") {
      filtered = filtered.filter((s) => s.kelas === selectedKelasFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term) ||
          s.kelas?.toLowerCase().includes(term)
      );
    }

    setFilteredSiswa(filtered);
  }

  // Group siswa by kelas for stats
  function getSiswaCountByKelas() {
    const counts: Record<string, number> = { all: siswa.length };
    siswa.forEach((s) => {
      const kelas = s.kelas || "Belum Ada Kelas";
      counts[kelas] = (counts[kelas] || 0) + 1;
    });
    return counts;
  }

  function startEdit(siswa: Siswa) {
    setEditingId(siswa.id);
    setEditForm({ ...siswa });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editingId) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/siswa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          full_name: editForm.full_name,
          kelas: editForm.kelas || null,
          tanggal_lahir: editForm.tanggal_lahir || null,
          jenis_kelamin: editForm.jenis_kelamin || null,
          no_telepon: editForm.no_telepon || null,
          alamat: editForm.alamat || null,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to update siswa");
      }

      toast.success("Data siswa berhasil diupdate");
      setEditingId(null);
      setEditForm({});
      fetchSiswa();
    } catch (err: any) {
      console.error("Error updating siswa:", err);
      toast.error(err.message || "Gagal mengupdate data siswa");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Yakin ingin menghapus siswa "${name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/siswa?id=${id}`, {
        method: "DELETE",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to delete siswa");
      }

      toast.success("Siswa berhasil dihapus");
      fetchSiswa();
    } catch (err: any) {
      console.error("Error deleting siswa:", err);
      toast.error(err.message || "Gagal menghapus siswa");
    }
  }

  async function handleAddSiswa() {
    if (!addForm.full_name.trim() || !addForm.email.trim()) {
      toast.error("Nama dan email harus diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use admin siswa API endpoint
      const response = await fetch("/api/admin/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addForm.email.trim(),
          full_name: addForm.full_name.trim(),
          kelas: addForm.kelas || null,
          sendEmail: false, // Don't send email, return password in response
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "email_exists") {
          throw new Error("Email sudah terdaftar");
        }
        throw new Error(data.error || "Gagal menambahkan siswa");
      }

      setCreatedAccount({
        email: data.email,
        password: data.temporaryPassword,
      });

      toast.success("Siswa berhasil ditambahkan!");
      setAddForm({ full_name: "", email: "", kelas: "" });

      // Refresh data siswa setelah delay kecil untuk memastikan database ter-update
      setTimeout(() => {
        fetchSiswa();
      }, 500);
    } catch (err: any) {
      console.error("Error adding siswa:", err);
      toast.error(err.message || "Gagal menambahkan siswa");
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Disalin ke clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function fetchProgress(siswaId: string) {
    setLoadingProgress(true);
    setSelectedSiswaId(siswaId);
    setShowProgressDialog(true);

    try {
      const response = await fetch(
        `/api/admin/materi-progress?siswa_id=${siswaId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memuat progress");
      }

      setProgressData(data);
    } catch (err: any) {
      console.error("Error fetching progress:", err);
      toast.error(err.message || "Gagal memuat progress materi");
      setShowProgressDialog(false);
    } finally {
      setLoadingProgress(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Siswa</h1>
          <p className="text-gray-600 mt-1">
            {selectedKelasFilter === "all" ? (
              <>
                Total <strong className="text-green-600">{siswa.length}</strong>{" "}
                siswa terdaftar
              </>
            ) : (
              <>
                Menampilkan{" "}
                <strong className="text-green-600">
                  {filteredSiswa.length}
                </strong>{" "}
                siswa dari kelas{" "}
                <strong className="text-green-600">
                  {selectedKelasFilter}
                </strong>
              </>
            )}
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus size={20} className="mr-2" />
          Tambah Siswa
        </Button>
      </div>

      {/* Filter by Kelas - Horizontal Tabs */}
      <Card className="p-3 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap mr-2">
            Filter Kelas:
          </span>
          <button
            onClick={() => setSelectedKelasFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              selectedKelasFilter === "all"
                ? "bg-green-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Semua ({getSiswaCountByKelas().all || 0})
          </button>
          {kelasOptions.map((kelas) => {
            const count = getSiswaCountByKelas()[kelas.name] || 0;
            return (
              <button
                key={kelas.id}
                onClick={() => setSelectedKelasFilter(kelas.name)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  selectedKelasFilter === kelas.name
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {kelas.name} ({count})
              </button>
            );
          })}
          {getSiswaCountByKelas()["Belum Ada Kelas"] > 0 && (
            <button
              onClick={() => setSelectedKelasFilter("Belum Ada Kelas")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                selectedKelasFilter === "Belum Ada Kelas"
                  ? "bg-yellow-600 text-white shadow-md"
                  : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              }`}
            >
              Belum Ada Kelas ({getSiswaCountByKelas()["Belum Ada Kelas"]})
            </button>
          )}
        </div>
      </Card>

      {/* Search Bar */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            type="text"
            placeholder="Cari siswa berdasarkan nama, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data siswa...</p>
        </div>
      ) : filteredSiswa.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            {searchTerm || selectedKelasFilter !== "all"
              ? `Tidak ada siswa ${
                  selectedKelasFilter !== "all"
                    ? `di kelas ${selectedKelasFilter}`
                    : ""
                } ${searchTerm ? "yang cocok dengan pencarian" : ""}`
              : "Belum ada siswa terdaftar"}
          </p>
          {selectedKelasFilter !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedKelasFilter("all")}
              className="mt-4"
            >
              Tampilkan Semua Siswa
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSiswa.map((s) => (
            <Card key={s.id} className="p-6 border-green-100">
              {editingId === s.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Lengkap
                      </label>
                      <Input
                        value={editForm.full_name || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="Nama lengkap"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email (tidak bisa diubah)
                      </label>
                      <Input value={s.email} disabled className="bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kelas
                      </label>
                      <select
                        value={editForm.kelas || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, kelas: e.target.value })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Pilih Kelas</option>
                        {kelasOptions.map((kelas) => (
                          <option key={kelas.id} value={kelas.name}>
                            {kelas.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal Lahir
                      </label>
                      <Input
                        type="date"
                        value={editForm.tanggal_lahir || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            tanggal_lahir: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jenis Kelamin
                      </label>
                      <select
                        value={editForm.jenis_kelamin || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            jenis_kelamin: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Pilih jenis kelamin</option>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        No. Telepon
                      </label>
                      <Input
                        value={editForm.no_telepon || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            no_telepon: e.target.value,
                          })
                        }
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alamat
                      </label>
                      <Input
                        value={editForm.alamat || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, alamat: e.target.value })
                        }
                        placeholder="Alamat lengkap"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={cancelEdit}>
                      <X size={16} className="mr-2" />
                      Batal
                    </Button>
                    <Button
                      onClick={saveEdit}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save size={16} className="mr-2" />
                      {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {s.full_name}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail size={16} />
                        {s.email}
                      </div>
                      {s.kelas && (
                        <div className="flex items-center gap-2">
                          <Users size={16} />
                          Kelas: {s.kelas}
                        </div>
                      )}
                      {s.jenis_kelamin && (
                        <div className="flex items-center gap-2">
                          <User size={16} />
                          {s.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        Terdaftar:{" "}
                        {new Date(s.created_at).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchProgress(s.id)}
                      className="border-blue-400 text-blue-600 hover:bg-blue-50"
                      title="Lihat Progress Materi"
                    >
                      <BookOpen size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(s)}
                      className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(s.id, s.full_name)}
                      className="border-red-400 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Siswa Baru</DialogTitle>
          </DialogHeader>
          {createdAccount ? (
            // Show created account credentials
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-3">
                  ✅ Akun siswa berhasil dibuat!
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <label className="font-medium text-gray-700">Email:</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-white rounded border">
                        {createdAccount.email}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(createdAccount.email)}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">
                      Password Sementara:
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-white rounded border">
                        {showPassword ? createdAccount.password : "••••••••"}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(createdAccount.password)}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  ⚠️ Simpan password ini dan berikan kepada siswa. Password
                  hanya ditampilkan sekali.
                </p>
              </div>
              <Button
                onClick={() => {
                  setCreatedAccount(null);
                  setShowAddDialog(false);
                  setShowPassword(false);
                  // Refresh data sekali lagi saat dialog ditutup
                  fetchSiswa();
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Tutup
              </Button>
            </div>
          ) : (
            // Add form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <Input
                  value={addForm.full_name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, full_name: e.target.value })
                  }
                  placeholder="Nama lengkap siswa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  placeholder="email@siswa.smksypm4.my.id"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kelas
                </label>
                <select
                  value={addForm.kelas}
                  onChange={(e) =>
                    setAddForm({ ...addForm, kelas: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Pilih Kelas</option>
                  {kelasOptions.map((kelas) => (
                    <option key={kelas.id} value={kelas.name}>
                      {kelas.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setAddForm({ full_name: "", email: "", kelas: "" });
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAddSiswa}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Menambahkan..." : "Tambah Siswa"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Progress Membaca Materi</DialogTitle>
          </DialogHeader>

          {loadingProgress ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat progress...</p>
            </div>
          ) : progressData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-3">
                    <BookOpen className="text-blue-600" size={24} />
                    <div>
                      <p className="text-2xl font-bold text-blue-900">
                        {progressData.total_materi}
                      </p>
                      <p className="text-xs text-blue-700">Total Materi</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-3">
                    <Check className="text-green-600" size={24} />
                    <div>
                      <p className="text-2xl font-bold text-green-900">
                        {progressData.materi_completed}
                      </p>
                      <p className="text-xs text-green-700">Selesai Dibaca</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Eye className="text-yellow-600" size={24} />
                    <div>
                      <p className="text-2xl font-bold text-yellow-900">
                        {progressData.materi_read}
                      </p>
                      <p className="text-xs text-yellow-700">Sudah Dibuka</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="text-purple-600" size={24} />
                    <div>
                      <p className="text-2xl font-bold text-purple-900">
                        {progressData.average_progress}%
                      </p>
                      <p className="text-xs text-purple-700">Rata-rata</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Kelas Info */}
              {progressData.kelas && (
                <div className="text-sm text-gray-600">
                  <strong>Kelas:</strong> {progressData.kelas}
                </div>
              )}

              {/* Progress List */}
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  Detail Progress per Materi
                </h3>

                {progressData.progress && progressData.progress.length > 0 ? (
                  <div className="space-y-3">
                    {progressData.progress.map((p) => (
                      <Card key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {p.materi.title}
                            </h4>
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">
                                  Sub-bab selesai: {p.completed_sub_bab} /{" "}
                                  {p.total_sub_bab}
                                </span>
                                <span className="font-semibold text-blue-600">
                                  {p.progress_percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${
                                    p.progress_percentage === 100
                                      ? "bg-green-600"
                                      : p.progress_percentage >= 50
                                      ? "bg-blue-600"
                                      : "bg-yellow-500"
                                  }`}
                                  style={{
                                    width: `${p.progress_percentage}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>
                                Terakhir dibaca:{" "}
                                {new Date(p.last_read_at).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                              {p.completed_at && (
                                <span className="text-green-600 font-medium">
                                  ✓ Selesai:{" "}
                                  {new Date(p.completed_at).toLocaleDateString(
                                    "id-ID",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          {p.progress_percentage === 100 && (
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="text-green-600" size={20} />
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center border-dashed">
                    <BookOpen
                      size={48}
                      className="mx-auto text-gray-400 mb-3"
                    />
                    <p className="text-gray-600">
                      Siswa belum membaca materi apapun
                    </p>
                  </Card>
                )}
              </div>

              <Button
                onClick={() => {
                  setShowProgressDialog(false);
                  setProgressData(null);
                  setSelectedSiswaId(null);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Tutup
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Tidak ada data progress</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
