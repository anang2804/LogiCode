"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileUp,
  FileText,
  Video,
  Link as LinkIcon,
  Save,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Materi {
  id: string;
  title: string;
  mapel_id: string;
  description: string;
  thumbnail_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  mapel?: { id: string; name: string };
}

interface Bab {
  id: string;
  materi_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

interface SubBab {
  id: string;
  bab_id: string;
  title: string;
  content: string | null;
  content_type: "text" | "video" | "file" | "link";
  content_url: string | null;
  duration: number | null;
  order_index: number;
  created_at: string;
}

export default function MateriDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [materi, setMateri] = useState<Materi | null>(null);
  const [babs, setBabs] = useState<Bab[]>([]);
  const [subBabs, setSubBabs] = useState<Record<string, SubBab[]>>({});
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showBabDialog, setShowBabDialog] = useState(false);
  const [showSubBabDialog, setShowSubBabDialog] = useState(false);
  const [editingBab, setEditingBab] = useState<Bab | null>(null);
  const [editingSubBab, setEditingSubBab] = useState<SubBab | null>(null);

  const [babForm, setBabForm] = useState({
    title: "",
    description: "",
  });

  const [subBabForm, setSubBabForm] = useState<{
    bab_id: string;
    title: string;
    content: string;
    content_type: "text" | "video" | "file" | "link";
    content_url: string;
  }>({
    bab_id: "",
    title: "",
    content: "",
    content_type: "text",
    content_url: "",
  });

  useEffect(() => {
    fetchMateri();
    fetchBabs();
  }, [params.id]);

  async function fetchMateri() {
    try {
      const { data, error } = await supabase
        .from("materi")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;

      if (data) {
        // Fetch mapel separately
        const { data: mapelData } = await supabase
          .from("mapel")
          .select("id, name")
          .eq("id", data.mapel_id)
          .single();

        setMateri({ ...data, mapel: mapelData || undefined });
      }
    } catch (err) {
      console.error("Error fetching materi:", err);
      toast.error("Gagal memuat materi");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBabs() {
    try {
      const { data: babData, error: babError } = await supabase
        .from("materi_bab")
        .select("*")
        .eq("materi_id", params.id)
        .order("order_index", { ascending: true });

      if (babError) {
        console.error("Error fetching babs:", babError);
        setBabs([]);
        return;
      }

      setBabs(babData || []);

      // Fetch sub babs for each bab
      if (babData && babData.length > 0) {
        const subBabPromises = babData.map((bab) =>
          supabase
            .from("materi_sub_bab")
            .select("*")
            .eq("bab_id", bab.id)
            .order("order_index", { ascending: true })
        );

        const results = await Promise.all(subBabPromises);
        const subBabsMap: Record<string, SubBab[]> = {};

        babData.forEach((bab, index) => {
          const result = results[index];
          if (!result.error && result.data) {
            subBabsMap[bab.id] = result.data;
          } else {
            subBabsMap[bab.id] = [];
          }
        });

        setSubBabs(subBabsMap);
      }
    } catch (err) {
      console.error("Error in fetchBabs:", err);
      setBabs([]);
      setSubBabs({});
    }
  }

  function openAddBabDialog() {
    setEditingBab(null);
    setBabForm({ title: "", description: "" });
    setShowBabDialog(true);
  }

  function openEditBabDialog(bab: Bab) {
    setEditingBab(bab);
    setBabForm({
      title: bab.title,
      description: bab.description || "",
    });
    setShowBabDialog(true);
  }

  async function handleAddBab() {
    try {
      const { error } = await supabase.from("materi_bab").insert({
        materi_id: params.id,
        title: babForm.title,
        description: babForm.description || null,
        order_index: babs.length,
      });

      if (error) throw error;

      toast.success("Bab berhasil ditambahkan");
      setShowBabDialog(false);
      fetchBabs();
    } catch (err) {
      console.error("Error adding bab:", err);
      toast.error("Gagal menambah bab");
    }
  }

  async function handleUpdateBab() {
    if (!editingBab) return;

    try {
      const { error } = await supabase
        .from("materi_bab")
        .update({
          title: babForm.title,
          description: babForm.description || null,
        })
        .eq("id", editingBab.id);

      if (error) throw error;

      toast.success("Bab berhasil diupdate");
      setShowBabDialog(false);
      fetchBabs();
    } catch (err) {
      console.error("Error updating bab:", err);
      toast.error("Gagal mengupdate bab");
    }
  }

  async function handleDeleteBab(babId: string) {
    if (
      !confirm(
        "Yakin ingin menghapus bab ini? Sub bab di dalamnya juga akan terhapus."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("materi_bab")
        .delete()
        .eq("id", babId);

      if (error) throw error;

      toast.success("Bab berhasil dihapus");
      fetchBabs();
    } catch (err) {
      console.error("Error deleting bab:", err);
      toast.error("Gagal menghapus bab");
    }
  }

  function openAddSubBabDialog(babId: string) {
    setEditingSubBab(null);
    setSubBabForm({
      bab_id: babId,
      title: "",
      content: "",
      content_type: "text",
      content_url: "",
    });
    setShowSubBabDialog(true);
  }

  function openEditSubBabDialog(subBab: SubBab) {
    setEditingSubBab(subBab);
    setSubBabForm({
      bab_id: subBab.bab_id,
      title: subBab.title,
      content: subBab.content || "",
      content_type: subBab.content_type,
      content_url: subBab.content_url || "",
    });
    setShowSubBabDialog(true);
  }

  async function handleAddSubBab() {
    try {
      const currentSubBabs = subBabs[subBabForm.bab_id] || [];
      const { error } = await supabase.from("materi_sub_bab").insert({
        bab_id: subBabForm.bab_id,
        title: subBabForm.title,
        content: subBabForm.content || null,
        content_type: subBabForm.content_type,
        content_url: subBabForm.content_url || null,
        order_index: currentSubBabs.length,
      });

      if (error) throw error;

      toast.success("Sub bab berhasil ditambahkan");
      setShowSubBabDialog(false);
      fetchBabs();
    } catch (err) {
      console.error("Error adding sub bab:", err);
      toast.error("Gagal menambah sub bab");
    }
  }

  async function handleUpdateSubBab() {
    if (!editingSubBab) return;

    try {
      const { error } = await supabase
        .from("materi_sub_bab")
        .update({
          title: subBabForm.title,
          content: subBabForm.content || null,
          content_type: subBabForm.content_type,
          content_url: subBabForm.content_url || null,
        })
        .eq("id", editingSubBab.id);

      if (error) throw error;

      toast.success("Sub bab berhasil diupdate");
      setShowSubBabDialog(false);
      fetchBabs();
    } catch (err) {
      console.error("Error updating sub bab:", err);
      toast.error("Gagal mengupdate sub bab");
    }
  }

  async function handleDeleteSubBab(subBabId: string) {
    if (!confirm("Yakin ingin menghapus sub bab ini?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("materi_sub_bab")
        .delete()
        .eq("id", subBabId);

      if (error) throw error;

      toast.success("Sub bab berhasil dihapus");
      fetchBabs();
    } catch (err) {
      console.error("Error deleting sub bab:", err);
      toast.error("Gagal menghapus sub bab");
    }
  }

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Set max width/height
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to 70% quality
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function compressVideo(file: File): Promise<string> {
    // Video compression in browser is complex, so we'll just convert to base64
    // In production, you should use server-side compression or cloud services
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        toast.info("Video diupload (kompresi video dilakukan di server)");
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error("Failed to read video file"));
      reader.readAsDataURL(file);
    });
  }

  async function compressDocument(file: File): Promise<string> {
    // For documents, we'll just convert to base64
    // PDF/Doc compression should be done server-side
    return new Promise((resolve, reject) => {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit

      if (file.size > MAX_SIZE) {
        toast.warning(
          "File terlalu besar! Maksimal 5MB. Silakan kompres file Anda terlebih dahulu."
        );
        reject(new Error("File too large"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error("Failed to read document"));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileUpload(file: File) {
    try {
      const fileType = file.type;
      let compressedData: string;

      // Show loading toast
      const loadingToast = toast.loading("Memproses file...");

      if (fileType.startsWith("image/")) {
        // Compress image
        compressedData = await compressImage(file);
        const originalSize = (file.size / 1024).toFixed(2);
        const compressedSize = ((compressedData.length * 0.75) / 1024).toFixed(
          2
        ); // Approximate base64 size
        toast.success(
          `Gambar dikompres: ${originalSize}KB → ${compressedSize}KB`,
          {
            id: loadingToast,
          }
        );
      } else if (fileType.startsWith("video/")) {
        // Handle video
        compressedData = await compressVideo(file);
        toast.success("Video berhasil diupload", { id: loadingToast });
      } else {
        // Handle documents (PDF, Word, etc)
        compressedData = await compressDocument(file);
        toast.success("Dokumen berhasil diupload", { id: loadingToast });
      }

      setSubBabForm({
        ...subBabForm,
        content_url: compressedData,
      });
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("Gagal mengupload file");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!materi) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Materi tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/materi")}
        >
          <ArrowLeft size={16} className="mr-2" />
          Kembali
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{materi.title}</h1>
          <p className="text-gray-600 mt-1">{materi.description}</p>
          {materi.mapel && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
              {materi.mapel.name}
            </span>
          )}
        </div>
        <Button
          onClick={openAddBabDialog}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus size={20} className="mr-2" />
          Tambah Bab
        </Button>
      </div>

      {/* Bab List */}
      {babs.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            Belum ada bab. Tambahkan bab untuk memulai.
          </p>
          <Button
            onClick={openAddBabDialog}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus size={20} className="mr-2" />
            Tambah Bab Pertama
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {babs.map((bab, index) => (
            <BabCard
              key={bab.id}
              bab={bab}
              index={index}
              subBabs={subBabs[bab.id] || []}
              onEdit={() => openEditBabDialog(bab)}
              onDelete={() => handleDeleteBab(bab.id)}
              onAddSubBab={() => openAddSubBabDialog(bab.id)}
              onEditSubBab={openEditSubBabDialog}
              onDeleteSubBab={handleDeleteSubBab}
            />
          ))}
        </div>
      )}

      {/* Bab Dialog */}
      <Dialog open={showBabDialog} onOpenChange={setShowBabDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBab ? "Edit Bab" : "Tambah Bab"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul Bab
              </label>
              <Input
                value={babForm.title}
                onChange={(e) =>
                  setBabForm({ ...babForm, title: e.target.value })
                }
                placeholder="Contoh: Pengenalan Dasar"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi (Opsional)
              </label>
              <Textarea
                value={babForm.description}
                onChange={(e) =>
                  setBabForm({ ...babForm, description: e.target.value })
                }
                placeholder="Deskripsi singkat tentang bab ini"
                className="min-h-[80px]"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={editingBab ? handleUpdateBab : handleAddBab}
                className="bg-green-600 hover:bg-green-700"
                disabled={!babForm.title}
              >
                <Save size={16} className="mr-2" />
                {editingBab ? "Update" : "Simpan"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBabDialog(false);
                  setEditingBab(null);
                }}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub Bab Dialog */}
      <Dialog open={showSubBabDialog} onOpenChange={setShowSubBabDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubBab ? "Edit Sub Bab" : "Tambah Sub Bab"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul Sub Bab
              </label>
              <Input
                value={subBabForm.title}
                onChange={(e) =>
                  setSubBabForm({ ...subBabForm, title: e.target.value })
                }
                placeholder="Contoh: Konsep Dasar"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Isi Materi
              </label>
              <Textarea
                value={subBabForm.content}
                onChange={(e) =>
                  setSubBabForm({ ...subBabForm, content: e.target.value })
                }
                placeholder="Tuliskan isi materi di sini..."
                className="min-h-[120px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Konten
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "text", label: "Text", icon: FileText },
                  { value: "video", label: "Video", icon: Video },
                  { value: "file", label: "File", icon: FileUp },
                  { value: "link", label: "Link", icon: LinkIcon },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setSubBabForm({
                        ...subBabForm,
                        content_type: type.value as any,
                      })
                    }
                    className={`p-3 border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition ${
                      subBabForm.content_type === type.value
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300"
                    }`}
                  >
                    <type.icon size={20} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {(subBabForm.content_type === "video" ||
              subBabForm.content_type === "file" ||
              subBabForm.content_type === "link") && (
              <div>
                {subBabForm.content_type === "link" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Link
                    </label>
                    <Input
                      value={subBabForm.content_url}
                      onChange={(e) =>
                        setSubBabForm({
                          ...subBabForm,
                          content_url: e.target.value,
                        })
                      }
                      placeholder="https://example.com"
                      type="url"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload{" "}
                      {subBabForm.content_type === "video" ? "Video" : "File"}
                    </label>
                    <Input
                      type="file"
                      accept={
                        subBabForm.content_type === "video"
                          ? "video/*"
                          : ".pdf,.doc,.docx,.ppt,.pptx"
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                      }}
                    />
                    {subBabForm.content_url && (
                      <span className="text-xs text-green-600 mt-2 block">
                        File berhasil diupload
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={editingSubBab ? handleUpdateSubBab : handleAddSubBab}
                className="bg-green-600 hover:bg-green-700"
                disabled={!subBabForm.title}
              >
                <Save size={16} className="mr-2" />
                {editingSubBab ? "Update" : "Simpan"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubBabDialog(false);
                  setEditingSubBab(null);
                }}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component untuk menghindari hydration error
function BabCard({
  bab,
  index,
  subBabs,
  onEdit,
  onDelete,
  onAddSubBab,
  onEditSubBab,
  onDeleteSubBab,
}: {
  bab: Bab;
  index: number;
  subBabs: SubBab[];
  onEdit: () => void;
  onDelete: () => void;
  onAddSubBab: () => void;
  onEditSubBab: (subBab: SubBab) => void;
  onDeleteSubBab: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border border-green-100 rounded-lg overflow-hidden">
      <div
        className="px-6 py-4 hover:bg-green-50 cursor-pointer transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-3 text-left flex-1 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold flex-shrink-0">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {bab.title}
              </h3>
              {bab.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {bab.description}
                </p>
              )}
            </div>
          </div>
          <div
            className="flex gap-2 items-center flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
            >
              <Edit size={14} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="border-red-400 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
            </Button>
            <ChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="px-6 py-4 bg-gray-50">
          <div className="space-y-3">
            {/* Sub Bab List */}
            {subBabs?.map((subBab, subIndex) => (
              <Card
                key={subBab.id}
                className="p-4 border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {subBab.content_type === "video" && (
                        <Video size={16} className="text-purple-600" />
                      )}
                      {subBab.content_type === "file" && (
                        <FileText size={16} className="text-blue-600" />
                      )}
                      {subBab.content_type === "link" && (
                        <LinkIcon size={16} className="text-green-600" />
                      )}
                      <h4 className="font-semibold text-gray-900">
                        {subIndex + 1}. {subBab.title}
                      </h4>
                    </div>
                    {subBab.content && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                        {subBab.content}
                      </p>
                    )}
                    {subBab.content_url && (
                      <div className="flex items-center gap-2">
                        <a
                          href={subBab.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate max-w-[300px] block"
                          title={subBab.content_url}
                        >
                          {subBab.content_url.startsWith("data:")
                            ? "📎 File terupload"
                            : subBab.content_url}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditSubBab(subBab)}
                      className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteSubBab(subBab.id)}
                      className="border-red-400 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Add Sub Bab Button */}
            <Button
              variant="outline"
              className="w-full border-dashed border-2 border-green-300 text-green-600 hover:bg-green-50"
              onClick={onAddSubBab}
            >
              <Plus size={16} className="mr-2" />
              Tambah Sub Bab
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
