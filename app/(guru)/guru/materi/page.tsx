"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  FileText,
  Link as LinkIcon,
  Video,
  Upload,
  Download,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Materi {
  id: string;
  title: string;
  description: string;
  content: string;
  mapel_id: string | null;
  kelas_id: string | null;
  created_at: string;
  created_by: string;
}

interface MateriPendukung {
  id: string;
  materi_id: string;
  type: "file" | "link" | "video";
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export default function GuruMateriPage() {
  const [materi, setMateri] = useState<Materi[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    mapel_id: "",
    kelas_id: "",
  });

  // State untuk konten materi
  const [contentType, setContentType] = useState<
    "text" | "file" | "link" | "video"
  >("text");
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [uploadingContent, setUploadingContent] = useState(false);

  const [selectedMateri, setSelectedMateri] = useState<string | null>(null);
  const [materiPendukung, setMateriPendukung] = useState<MateriPendukung[]>([]);
  const [showPendukungDialog, setShowPendukungDialog] = useState(false);
  const [pendukungType, setPendukungType] = useState<"file" | "link" | "video">(
    "file"
  );
  const [pendukungForm, setPendukungForm] = useState({
    title: "",
    description: "",
    url: "",
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: materiData } = await supabase
        .from("materi")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      setMateri(materiData || []);

      const { data: mapelData } = await supabase
        .from("mata_pelajaran")
        .select("*")
        .order("nama");
      setMapelList(mapelData || []);

      const { data: kelasData } = await supabase
        .from("kelas")
        .select("*")
        .order("nama");
      setKelasList(kelasData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMateriPendukung = async (materiId: string) => {
    try {
      const { data } = await supabase
        .from("materi_pendukung")
        .select("*")
        .eq("materi_id", materiId)
        .order("created_at", { ascending: false });

      setMateriPendukung(data || []);
    } catch (error) {
      console.error("Error fetching materi pendukung:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      let contentValue = formData.content;

      // Upload content file jika ada
      if (contentType === "file" && contentFile) {
        setUploadingContent(true);
        const fileExt = contentFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/content/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("materi-files")
          .upload(filePath, contentFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("materi-files")
          .getPublicUrl(filePath);
        contentValue = urlData.publicUrl;
        setUploadingContent(false);
      }

      if (editingId) {
        const { error } = await supabase
          .from("materi")
          .update({
            title: formData.title,
            description: formData.description,
            content: contentValue,
            mapel_id: formData.mapel_id || null,
            kelas_id: formData.kelas_id || null,
          })
          .eq("id", editingId);

        if (error) throw error;
        alert("Materi berhasil diperbarui");
      } else {
        const { error } = await supabase.from("materi").insert({
          title: formData.title,
          description: formData.description,
          content: contentValue,
          mapel_id: formData.mapel_id || null,
          kelas_id: formData.kelas_id || null,
          created_by: user.id,
        });

        if (error) throw error;
        alert("Materi berhasil ditambahkan");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        title: "",
        description: "",
        content: "",
        mapel_id: "",
        kelas_id: "",
      });
      setContentType("text");
      setContentFile(null);
      fetchData();
    } catch (error: any) {
      console.error("Error saving materi:", error);
      alert(`Gagal menyimpan materi: ${error.message}`);
    }
  };

  const handleEdit = (m: Materi) => {
    setEditingId(m.id);
    setFormData({
      title: m.title,
      description: m.description || "",
      content: m.content || "",
      mapel_id: m.mapel_id || "",
      kelas_id: m.kelas_id || "",
    });

    // Deteksi tipe konten
    if (m.content && m.content.startsWith("http")) {
      if (
        m.content.includes("youtube.com") ||
        m.content.includes("youtu.be") ||
        m.content.includes("vimeo.com")
      ) {
        setContentType("video");
      } else if (
        m.content.includes(".pdf") ||
        m.content.includes(".doc") ||
        m.content.includes(".ppt")
      ) {
        setContentType("file");
      } else {
        setContentType("link");
      }
    } else {
      setContentType("text");
    }

    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus materi ini? Semua file pendukung juga akan dihapus."))
      return;

    try {
      const { error } = await supabase.from("materi").delete().eq("id", id);
      if (error) throw error;
      alert("Materi berhasil dihapus");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting materi:", error);
      alert(`Gagal menghapus materi: ${error.message}`);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    materiId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("Ukuran file maksimal 50MB");
      return;
    }

    try {
      setUploadingFile(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${materiId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("materi-files")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("materi-files")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("materi_pendukung")
        .insert({
          materi_id: materiId,
          type: "file",
          title: file.name,
          description: null,
          url: urlData.publicUrl,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          created_by: user.id,
        });

      if (dbError) throw dbError;
      alert("File berhasil diunggah");
      fetchMateriPendukung(materiId);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert(`Gagal mengunggah file: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddLink = async (materiId: string) => {
    if (!pendukungForm.url || !pendukungForm.title) {
      alert("Judul dan URL harus diisi");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("materi_pendukung").insert({
        materi_id: materiId,
        type: pendukungType,
        title: pendukungForm.title,
        description: pendukungForm.description || null,
        url: pendukungForm.url,
        created_by: user.id,
      });

      if (error) throw error;
      alert(
        `${pendukungType === "video" ? "Video" : "Link"} berhasil ditambahkan`
      );
      fetchMateriPendukung(materiId);
      setPendukungForm({ title: "", description: "", url: "" });
      setPendukungType("file");
    } catch (error: any) {
      console.error("Error adding link:", error);
      alert(`Gagal menambahkan: ${error.message}`);
    }
  };

  const handleDeletePendukung = async (pendukung: MateriPendukung) => {
    if (!confirm("Hapus file/link ini?")) return;

    try {
      if (pendukung.type === "file" && pendukung.file_path) {
        await supabase.storage
          .from("materi-files")
          .remove([pendukung.file_path]);
      }

      const { error } = await supabase
        .from("materi_pendukung")
        .delete()
        .eq("id", pendukung.id);
      if (error) throw error;
      alert("Berhasil dihapus");
      fetchMateriPendukung(pendukung.materi_id);
    } catch (error: any) {
      console.error("Error deleting:", error);
      alert(`Gagal menghapus: ${error.message}`);
    }
  };

  const openPendukungDialog = (materiId: string) => {
    setSelectedMateri(materiId);
    fetchMateriPendukung(materiId);
    setShowPendukungDialog(true);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="text-gray-500" size={20} />;
    if (fileType.includes("pdf"))
      return <FileText className="text-red-500" size={20} />;
    if (fileType.includes("word") || fileType.includes("document"))
      return <FileText className="text-blue-500" size={20} />;
    if (fileType.includes("presentation"))
      return <FileText className="text-orange-500" size={20} />;
    if (fileType.includes("image"))
      return <FileText className="text-green-500" size={20} />;
    return <FileText className="text-gray-500" size={20} />;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Kelola Materi Pembelajaran
          </h1>
          <p className="text-gray-600 mt-2">
            Buat, edit, dan kelola materi pembelajaran beserta file pendukung
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              title: "",
              description: "",
              content: "",
              mapel_id: "",
              kelas_id: "",
            });
          }}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <Plus size={20} />
          Tambah Materi
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-green-100 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? "Edit Materi" : "Tambah Materi Baru"}
            </h3>

            <div>
              <Label htmlFor="title">Judul Materi *</Label>
              <Input
                id="title"
                type="text"
                placeholder="Contoh: Pengenalan Algoritma Pemrograman"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="border-green-200"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mapel">Mata Pelajaran</Label>
                <select
                  id="mapel"
                  value={formData.mapel_id}
                  onChange={(e) =>
                    setFormData({ ...formData, mapel_id: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-green-200 bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih Mata Pelajaran</option>
                  {mapelList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="kelas">Kelas</Label>
                <select
                  id="kelas"
                  value={formData.kelas_id}
                  onChange={(e) =>
                    setFormData({ ...formData, kelas_id: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-green-200 bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Deskripsi Singkat</Label>
              <Textarea
                id="description"
                placeholder="Ringkasan materi yang akan disampaikan"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="border-green-200"
                rows={3}
              />
            </div>

            <div>
              <Label>Tipe Konten Materi *</Label>
              <div className="grid grid-cols-4 gap-3 mt-2">
                <Button
                  type="button"
                  variant={contentType === "text" ? "default" : "outline"}
                  onClick={() => setContentType("text")}
                  className={contentType === "text" ? "bg-green-600" : ""}
                >
                  <FileText size={16} className="mr-2" />
                  Teks
                </Button>
                <Button
                  type="button"
                  variant={contentType === "file" ? "default" : "outline"}
                  onClick={() => setContentType("file")}
                  className={contentType === "file" ? "bg-blue-600" : ""}
                >
                  <Upload size={16} className="mr-2" />
                  File
                </Button>
                <Button
                  type="button"
                  variant={contentType === "link" ? "default" : "outline"}
                  onClick={() => setContentType("link")}
                  className={contentType === "link" ? "bg-purple-600" : ""}
                >
                  <LinkIcon size={16} className="mr-2" />
                  Link
                </Button>
                <Button
                  type="button"
                  variant={contentType === "video" ? "default" : "outline"}
                  onClick={() => setContentType("video")}
                  className={contentType === "video" ? "bg-red-600" : ""}
                >
                  <Video size={16} className="mr-2" />
                  Video
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="content">Konten Materi *</Label>

              {contentType === "text" && (
                <Textarea
                  id="content"
                  placeholder="Tulis konten materi pembelajaran di sini..."
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  required
                  className="border-green-200 mt-2"
                  rows={8}
                />
              )}

              {contentType === "file" && (
                <div className="mt-2">
                  <div className="border-2 border-dashed border-green-200 rounded-lg p-6 text-center hover:border-green-400 transition">
                    <Upload className="mx-auto text-green-600 mb-2" size={32} />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload file materi (PDF, DOCX, PPTX, ZIP)
                    </p>
                    <p className="text-xs text-gray-400 mb-3">Maksimal 50MB</p>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                      onChange={(e) =>
                        setContentFile(e.target.files?.[0] || null)
                      }
                      required
                      className="cursor-pointer"
                    />
                    {contentFile && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {contentFile.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {contentType === "link" && (
                <Input
                  id="content"
                  type="url"
                  placeholder="https://contoh.com/materi"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  required
                  className="border-green-200 mt-2"
                />
              )}

              {contentType === "video" && (
                <div className="mt-2 space-y-2">
                  <Input
                    id="content"
                    type="url"
                    placeholder="https://youtube.com/watch?v=... atau https://vimeo.com/..."
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    required
                    className="border-green-200"
                  />
                  <p className="text-xs text-gray-500">
                    Masukkan URL video dari YouTube, Vimeo, atau platform video
                    lainnya
                  </p>
                </div>
              )}

              {uploadingContent && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 mb-2">
                    Mengunggah file konten...
                  </p>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full w-1/2 animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {editingId ? "Perbarui Materi" : "Simpan Materi"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    title: "",
                    description: "",
                    content: "",
                    mapel_id: "",
                    kelas_id: "",
                  });
                }}
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
        <div className="grid gap-6">
          {materi.map((m) => (
            <Card
              key={m.id}
              className="p-6 border-green-100 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{m.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{m.description}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    Dibuat:{" "}
                    {new Date(m.created_at).toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => openPendukungDialog(m.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Paperclip size={16} className="mr-1" />
                    File Pendukung
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEdit(m)}
                    variant="outline"
                    className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDelete(m.id)}
                    variant="outline"
                    className="border-red-400 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                {m.content && m.content.startsWith("http") ? (
                  <div className="space-y-2">
                    {m.content.includes("youtube.com") ||
                    m.content.includes("youtu.be") ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <Video size={16} className="text-red-600" />
                          Video YouTube:
                        </p>
                        <a
                          href={m.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-2"
                        >
                          {m.content}
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ) : m.content.includes("vimeo.com") ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <Video size={16} className="text-blue-600" />
                          Video Vimeo:
                        </p>
                        <a
                          href={m.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-2"
                        >
                          {m.content}
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ) : m.content.includes(".pdf") ||
                      m.content.includes(".doc") ||
                      m.content.includes(".ppt") ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <FileText size={16} className="text-red-600" />
                          File Materi:
                        </p>
                        <a
                          href={m.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          <Download size={16} />
                          Download File
                        </a>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <LinkIcon size={16} className="text-green-600" />
                          Link Eksternal:
                        </p>
                        <a
                          href={m.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-2"
                        >
                          {m.content}
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="prose max-w-none text-gray-700">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showPendukungDialog} onOpenChange={setShowPendukungDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>File Pendukung Pembelajaran</DialogTitle>
            <DialogDescription>
              Tambahkan file, link, atau video untuk melengkapi materi
              pembelajaran
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4 border-blue-200 hover:bg-blue-50 transition cursor-pointer">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-center">
                    <Upload className="mx-auto text-blue-600 mb-2" size={32} />
                    <h4 className="font-semibold text-blue-900">Upload File</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      PDF, DOCX, PPTX (max 50MB)
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      selectedMateri && handleFileUpload(e, selectedMateri)
                    }
                    disabled={uploadingFile}
                  />
                </label>
              </Card>

              <Card
                className="p-4 border-green-200 hover:bg-green-50 transition cursor-pointer"
                onClick={() => setPendukungType("link")}
              >
                <div className="text-center">
                  <LinkIcon className="mx-auto text-green-600 mb-2" size={32} />
                  <h4 className="font-semibold text-green-900">Tambah Link</h4>
                  <p className="text-xs text-gray-600 mt-1">Tautan eksternal</p>
                </div>
              </Card>

              <Card
                className="p-4 border-red-200 hover:bg-red-50 transition cursor-pointer"
                onClick={() => setPendukungType("video")}
              >
                <div className="text-center">
                  <Video className="mx-auto text-red-600 mb-2" size={32} />
                  <h4 className="font-semibold text-red-900">Tambah Video</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    YouTube, Vimeo, dll
                  </p>
                </div>
              </Card>
            </div>

            {(pendukungType === "link" || pendukungType === "video") && (
              <Card className="p-4 border-gray-200">
                <h4 className="font-semibold mb-3">
                  Tambah {pendukungType === "video" ? "Video" : "Link"}
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label>Judul *</Label>
                    <Input
                      placeholder={`Judul ${
                        pendukungType === "video" ? "video" : "link"
                      }`}
                      value={pendukungForm.title}
                      onChange={(e) =>
                        setPendukungForm({
                          ...pendukungForm,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>URL *</Label>
                    <Input
                      placeholder="https://..."
                      value={pendukungForm.url}
                      onChange={(e) =>
                        setPendukungForm({
                          ...pendukungForm,
                          url: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Deskripsi</Label>
                    <Textarea
                      placeholder="Opsional"
                      value={pendukungForm.description}
                      onChange={(e) =>
                        setPendukungForm({
                          ...pendukungForm,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        selectedMateri && handleAddLink(selectedMateri)
                      }
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Tambah
                    </Button>
                    <Button
                      onClick={() => {
                        setPendukungType("file");
                        setPendukungForm({
                          title: "",
                          description: "",
                          url: "",
                        });
                      }}
                      variant="outline"
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {uploadingFile && (
              <Card className="p-4 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Mengunggah file...
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-blue-600 h-2 rounded-full w-1/2 animate-pulse" />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                File Pendukung yang Tersedia
              </h4>
              {materiPendukung.length === 0 ? (
                <Card className="p-8 text-center border-gray-200">
                  <Paperclip size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">
                    Belum ada file pendukung
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {materiPendukung.map((p) => (
                    <Card
                      key={p.id}
                      className="p-4 border-gray-200 hover:border-green-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div>
                            {p.type === "file" && getFileIcon(p.file_type)}
                            {p.type === "link" && (
                              <LinkIcon className="text-green-600" size={20} />
                            )}
                            {p.type === "video" && (
                              <Video className="text-red-600" size={20} />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {p.title}
                            </p>
                            {p.description && (
                              <p className="text-xs text-gray-600">
                                {p.description}
                              </p>
                            )}
                            {p.file_size && (
                              <p className="text-xs text-gray-500">
                                {formatFileSize(p.file_size)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {p.url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(p.url!, "_blank")}
                              className="border-blue-300 text-blue-600"
                            >
                              {p.type === "file" ? (
                                <Download size={16} />
                              ) : (
                                <ExternalLink size={16} />
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePendukung(p)}
                            className="border-red-300 text-red-600"
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
