"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Video,
  Link as LinkIcon,
  CheckCircle,
  Circle,
  Play,
  Lock,
  ChevronDown,
  ChevronRight,
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
  mapel?: { id: string; name: string };
  profiles?: { full_name: string };
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
  order_index: number;
  created_at: string;
  completed?: boolean;
}

export default function SiswaMateriDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [materi, setMateri] = useState<Materi | null>(null);
  const [babs, setBabs] = useState<Bab[]>([]);
  const [subBabs, setSubBabs] = useState<Record<string, SubBab[]>>({});
  const [expandedBabs, setExpandedBabs] = useState<Set<string>>(new Set());
  const [selectedSubBab, setSelectedSubBab] = useState<SubBab | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMateri();
    fetchBabsAndProgress();
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

        // Fetch creator profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.created_by)
          .single();

        setMateri({
          ...data,
          mapel: mapelData || undefined,
          profiles: profileData || undefined,
        });
      }
    } catch (err) {
      console.error("Error fetching materi:", err);
      toast.error("Gagal memuat materi");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBabsAndProgress() {
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

      // Fetch progress data from API
      const progressResponse = await fetch(
        `/api/siswa/materi-progress?materi_id=${params.id}`
      );
      const progressData = await progressResponse.json();

      // Create a map of completed sub-babs
      const completedSubBabIds = new Set(
        (progressData.sub_bab_progress || [])
          .filter((p: any) => p.completed)
          .map((p: any) => p.sub_bab_id)
      );

      // Fetch sub babs for each bab
      if (babData && babData.length > 0) {
        const subBabPromises = babData.map((bab: any) =>
          supabase
            .from("materi_sub_bab")
            .select("*")
            .eq("bab_id", bab.id)
            .order("order_index", { ascending: true })
        );

        const results = await Promise.all(subBabPromises);
        const subBabsMap: Record<string, SubBab[]> = {};

        babData.forEach((bab: any, index: number) => {
          const result = results[index];
          if (!result.error && result.data) {
            // Add real completed status from database
            subBabsMap[bab.id] = result.data.map((sb: any) => ({
              ...sb,
              completed: completedSubBabIds.has(sb.id),
            }));
          } else {
            subBabsMap[bab.id] = [];
          }
        });

        setSubBabs(subBabsMap);

        // Auto-expand first bab and select first sub-bab
        if (babData.length > 0) {
          const firstBabId = babData[0].id;
          setExpandedBabs(new Set([firstBabId]));
          if (subBabsMap[firstBabId]?.length > 0) {
            setSelectedSubBab(subBabsMap[firstBabId][0]);
          }
        }
      }
    } catch (err) {
      console.error("Error in fetchBabsAndProgress:", err);
      setBabs([]);
      setSubBabs({});
    }
  }

  function toggleBab(babId: string) {
    const newExpanded = new Set(expandedBabs);
    if (newExpanded.has(babId)) {
      newExpanded.delete(babId);
    } else {
      newExpanded.add(babId);
    }
    setExpandedBabs(newExpanded);
  }

  function handleSelectSubBab(subBab: SubBab) {
    setSelectedSubBab(subBab);
  }

  // Get all sub babs in order (flat list)
  function getAllSubBabsInOrder(): SubBab[] {
    const allSubBabs: SubBab[] = [];
    babs.forEach((bab) => {
      if (subBabs[bab.id]) {
        allSubBabs.push(...subBabs[bab.id]);
      }
    });
    return allSubBabs;
  }

  // Get next sub-bab
  function getNextSubBab(): SubBab | null {
    if (!selectedSubBab) return null;
    const allSubBabs = getAllSubBabsInOrder();
    const currentIndex = allSubBabs.findIndex(
      (sb) => sb.id === selectedSubBab.id
    );
    if (currentIndex >= 0 && currentIndex < allSubBabs.length - 1) {
      return allSubBabs[currentIndex + 1];
    }
    return null;
  }

  // Get previous sub-bab
  function getPreviousSubBab(): SubBab | null {
    if (!selectedSubBab) return null;
    const allSubBabs = getAllSubBabsInOrder();
    const currentIndex = allSubBabs.findIndex(
      (sb) => sb.id === selectedSubBab.id
    );
    if (currentIndex > 0) {
      return allSubBabs[currentIndex - 1];
    }
    return null;
  }

  // Handle mark complete and navigate to next
  async function handleMarkCompleteAndNext() {
    if (!selectedSubBab) return;

    try {
      // Call API to mark sub-bab as complete
      const response = await fetch("/api/siswa/materi-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub_bab_id: selectedSubBab.id,
          completed: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan progress");
      }

      // Update local state
      setSubBabs((prev) => {
        const newSubBabs = { ...prev };
        Object.keys(newSubBabs).forEach((babId) => {
          newSubBabs[babId] = newSubBabs[babId].map((sb) =>
            sb.id === selectedSubBab.id ? { ...sb, completed: true } : sb
          );
        });
        return newSubBabs;
      });

      toast.success("Sub-bab ditandai selesai! ✓");

      // Notify list page that progress has been updated
      localStorage.setItem("materi_progress_updated", Date.now().toString());
      // Trigger storage event manually for same-page communication
      window.dispatchEvent(new Event("storage"));

      // Show progress info
      if (data.materi_progress) {
        const { completed_sub_bab, total_sub_bab, progress_percentage } =
          data.materi_progress;
        toast.info(
          `Progress: ${completed_sub_bab}/${total_sub_bab} sub-bab (${progress_percentage}%)`,
          { duration: 3000 }
        );
      }

      // Navigate to next sub-bab if available
      const nextSubBab = getNextSubBab();
      if (nextSubBab) {
        setTimeout(() => {
          setSelectedSubBab(nextSubBab);
          // Auto-expand the bab that contains the next sub-bab
          const nextBabId = Object.keys(subBabs).find((babId) =>
            subBabs[babId].some((sb) => sb.id === nextSubBab.id)
          );
          if (nextBabId) {
            setExpandedBabs((prev) => new Set([...prev, nextBabId]));
          }
          // Scroll to top of content
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 1000);
      } else {
        // All sub-babs completed
        toast.success("🎉 Selamat! Anda telah menyelesaikan semua materi!", {
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error("Error marking complete:", error);
      toast.error(error.message || "Gagal menyimpan progress");
    }
  }

  // Handle navigate to previous
  function handleNavigatePrevious() {
    const prevSubBab = getPreviousSubBab();
    if (prevSubBab) {
      setSelectedSubBab(prevSubBab);
      // Auto-expand the bab that contains the previous sub-bab
      const prevBabId = Object.keys(subBabs).find((babId) =>
        subBabs[babId].some((sb) => sb.id === prevSubBab.id)
      );
      if (prevBabId) {
        setExpandedBabs((prev) => new Set([...prev, prevBabId]));
      }
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.info("Ini adalah sub-bab pertama");
    }
  }

  function renderContent() {
    if (!selectedSubBab) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-12">
          <BookOpen size={64} className="text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            Pilih Sub-Bab untuk Mulai Belajar
          </h3>
          <p className="text-gray-500">
            Pilih salah satu sub-bab dari daftar di sebelah kiri
          </p>
        </div>
      );
    }

    return (
      <div className="p-8">
        {/* Sub-Bab Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {selectedSubBab.content_type === "video" && (
              <Video size={20} className="text-purple-600" />
            )}
            {selectedSubBab.content_type === "file" && (
              <FileText size={20} className="text-blue-600" />
            )}
            {selectedSubBab.content_type === "link" && (
              <LinkIcon size={20} className="text-green-600" />
            )}
            {selectedSubBab.content_type === "text" && (
              <FileText size={20} className="text-gray-600" />
            )}
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedSubBab.title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white">
          {/* Text Content */}
          {selectedSubBab.content && (
            <Card className="p-6 mb-6 shadow-sm">
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedSubBab.content}
                </p>
              </div>
            </Card>
          )}

          {/* Media Content */}
          {selectedSubBab.content_url && (
            <div>
              {/* Video Content */}
              {selectedSubBab.content_type === "video" && (
                <Card className="p-0 mb-6 shadow-sm overflow-hidden">
                  {selectedSubBab.content_url.startsWith("http") ? (
                    <div className="aspect-video bg-black">
                      <video
                        controls
                        className="w-full h-full"
                        src={selectedSubBab.content_url}
                      >
                        Browser Anda tidak mendukung video.
                      </video>
                    </div>
                  ) : (
                    <div className="aspect-video bg-black flex items-center justify-center">
                      <p className="text-white">
                        Video tidak dapat ditampilkan
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* File/Document Content - Display as iframe or embed */}
              {selectedSubBab.content_type === "file" && (
                <Card className="p-0 mb-6 shadow-sm overflow-hidden">
                  {selectedSubBab.content_url.startsWith("data:") ? (
                    <div className="w-full h-[calc(100vh-250px)] bg-gray-50">
                      <iframe
                        src={selectedSubBab.content_url}
                        className="w-full h-full border-0"
                        title={selectedSubBab.title}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[calc(100vh-250px)] bg-gray-50">
                      <iframe
                        src={selectedSubBab.content_url}
                        className="w-full h-full border-0"
                        title={selectedSubBab.title}
                      />
                    </div>
                  )}
                </Card>
              )}

              {/* Link Content - Display as iframe */}
              {selectedSubBab.content_type === "link" &&
                selectedSubBab.content_url.startsWith("http") && (
                  <Card className="p-0 mb-6 shadow-sm overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkIcon size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 truncate max-w-md">
                          {selectedSubBab.content_url}
                        </span>
                      </div>
                      <a
                        href={selectedSubBab.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-shrink-0"
                      >
                        Buka di Tab Baru
                      </a>
                    </div>
                    <div className="w-full h-[calc(100vh-300px)] bg-white">
                      <iframe
                        src={selectedSubBab.content_url}
                        className="w-full h-full border-0"
                        title={selectedSubBab.title}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      />
                    </div>
                  </Card>
                )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="px-8 pb-8">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => {
                handleNavigatePrevious();
              }}
            >
              ← Sebelumnya
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                handleMarkCompleteAndNext();
              }}
            >
              {getNextSubBab()
                ? "Tandai Selesai & Lanjut →"
                : "Tandai Selesai ✓"}
            </Button>
          </div>
        </div>
      </div>
    );
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

  // Calculate total progress
  const totalSubBabs = Object.values(subBabs).reduce(
    (acc, subs) => acc + subs.length,
    0
  );
  const completedSubBabs = Object.values(subBabs).reduce(
    (acc, subs) => acc + subs.filter((sb) => sb.completed).length,
    0
  );
  const progressPercentage =
    totalSubBabs > 0 ? Math.round((completedSubBabs / totalSubBabs) * 100) : 0;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Trigger refresh on list page
                localStorage.setItem(
                  "materi_progress_updated",
                  Date.now().toString()
                );
                router.push("/siswa/materi");
              }}
            >
              <ArrowLeft size={16} className="mr-2" />
              Kembali
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">
                {materi.title}
              </h1>
              {materi.mapel && (
                <p className="text-sm text-gray-600">{materi.mapel.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {materi.profiles && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Pengajar</p>
                <p className="text-sm font-semibold text-gray-900">
                  {materi.profiles.full_name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {totalSubBabs > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">
                  <span className="font-bold text-green-600">
                    {progressPercentage}%
                  </span>{" "}
                  complete
                </span>
                <span className="text-xs text-gray-500">
                  {completedSubBabs}/{totalSubBabs} lessons
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Daftar Bab & Sub-Bab */}
        <div className="w-80 bg-gray-50 border-r overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-green-600" />
              Daftar Materi
            </h2>

            {babs.length === 0 ? (
              <Card className="p-6 text-center">
                <FileText size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Belum ada materi yang tersedia
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {babs.map((bab, babIndex) => (
                  <div key={bab.id}>
                    {/* Bab Header */}
                    <button
                      onClick={() => toggleBab(bab.id)}
                      className="w-full p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold flex-shrink-0">
                          {babIndex + 1}
                        </span>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">
                              {bab.title}
                            </h3>
                            {/* Progress Badge */}
                            <span className="text-xs font-bold text-gray-700 flex-shrink-0">
                              {subBabs[bab.id]
                                ? `${
                                    subBabs[bab.id].filter((sb) => sb.completed)
                                      .length
                                  }/${subBabs[bab.id].length}`
                                : "0/0"}
                            </span>
                          </div>
                          {bab.description && (
                            <p className="text-xs text-gray-600 truncate">
                              {bab.description}
                            </p>
                          )}
                        </div>
                        {expandedBabs.has(bab.id) ? (
                          <ChevronDown
                            size={20}
                            className="text-gray-400 flex-shrink-0"
                          />
                        ) : (
                          <ChevronRight
                            size={20}
                            className="text-gray-400 flex-shrink-0"
                          />
                        )}
                      </div>
                    </button>

                    {/* Sub-Bab List */}
                    {expandedBabs.has(bab.id) && subBabs[bab.id] && (
                      <div className="ml-4 mt-2 space-y-1">
                        {subBabs[bab.id].map((subBab, subIndex) => (
                          <button
                            key={subBab.id}
                            onClick={() => handleSelectSubBab(subBab)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition ${
                              selectedSubBab?.id === subBab.id
                                ? "bg-green-100 border-green-400"
                                : "bg-white border-gray-200 hover:border-green-300 hover:bg-green-50"
                            }`}
                          >
                            <div className="flex-shrink-0">
                              {subBab.completed ? (
                                <CheckCircle
                                  size={20}
                                  className="text-green-600"
                                />
                              ) : (
                                <Circle size={20} className="text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {subIndex + 1}. {subBab.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                {subBab.content_type === "video" && (
                                  <Video
                                    size={12}
                                    className="text-purple-600"
                                  />
                                )}
                                {subBab.content_type === "file" && (
                                  <FileText
                                    size={12}
                                    className="text-blue-600"
                                  />
                                )}
                                {subBab.content_type === "link" && (
                                  <LinkIcon
                                    size={12}
                                    className="text-green-600"
                                  />
                                )}
                                <span className="text-xs text-gray-500 capitalize">
                                  {subBab.content_type}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
