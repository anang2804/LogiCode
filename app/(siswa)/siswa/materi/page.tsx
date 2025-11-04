"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Eye,
  Download,
  FileText,
  Calendar,
  User,
  Search,
  Filter,
  Play,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Materi {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  mapel_id?: string;
  created_by?: string;
  created_at: string;
  mapel?: {
    id: string;
    name: string;
  };
  profiles?: {
    full_name: string;
  };
  progress?: number; // Progress percentage 0-100
}

export default function SiswaMateriPage() {
  const [materi, setMateri] = useState<Materi[]>([]);
  const [filteredMateri, setFilteredMateri] = useState<Materi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMapel, setSelectedMapel] = useState<string>("all");
  const [mapelList, setMapelList] = useState<any[]>([]);

  useEffect(() => {
    fetchMateri();

    // Refresh progress when user returns to this page
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMateri();
      }
    };

    // Listen for progress updates from detail page
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "materi_progress_updated") {
        fetchMateri();
        // Clear the flag
        localStorage.removeItem("materi_progress_updated");
      }
    };

    // Refresh when page becomes visible (user comes back from detail page)
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also refresh on focus (when user switches back to tab)
    window.addEventListener("focus", fetchMateri);

    // Listen for storage events (cross-tab/page communication)
    window.addEventListener("storage", handleStorageChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", fetchMateri);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    filterMateri();
  }, [searchTerm, selectedMapel, materi]);

  const fetchMateri = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch materi data
      const { data: materiData, error: materiError } = await supabase
        .from("materi")
        .select("*")
        .order("created_at", { ascending: false });

      if (materiError) throw materiError;

      // Fetch all progress for this user
      const progressResponse = await fetch("/api/siswa/materi-progress");
      const progressData = await progressResponse.json();
      const progressMap = new Map(
        (progressData.data || []).map((p: any) => [
          p.materi_id,
          p.progress_percentage,
        ])
      );

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

        // Merge data with real progress from database
        const enrichedData = materiData.map((materi) => ({
          ...materi,
          mapel: mapelData?.find((m) => m.id === materi.mapel_id) || null,
          profiles:
            profilesData?.find((p) => p.id === materi.created_by) || null,
          progress: progressMap.get(materi.id) || 0, // Real progress from database
        }));

        setMateri(enrichedData);
        setFilteredMateri(enrichedData);

        // Get unique mapel untuk filter
        const uniqueMapel = mapelData || [];
        setMapelList(uniqueMapel);
      }
    } catch (error) {
      console.error("Error fetching materi:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterMateri = () => {
    let filtered = [...materi];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title?.toLowerCase().includes(term) ||
          m.description?.toLowerCase().includes(term) ||
          m.mapel?.name?.toLowerCase().includes(term)
      );
    }

    // Filter by mapel
    if (selectedMapel !== "all") {
      filtered = filtered.filter((m) => m.mapel_id === selectedMapel);
    }

    setFilteredMateri(filtered);
  };

  const handleViewMateri = (materiId: string) => {
    // Navigate to materi detail page
    window.location.href = `/siswa/materi/${materiId}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Materi Pembelajaran
          </h1>
          <p className="text-gray-600 mt-1">
            Akses semua materi pembelajaran yang tersedia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="text-green-600" size={32} />
          <span className="text-2xl font-bold text-green-600">
            {filteredMateri.length}
          </span>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <Input
              type="text"
              placeholder="Cari materi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              className="w-full pl-10 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Semua Mata Pelajaran</option>
              {mapelList.map((mapel) => (
                <option key={mapel.id} value={mapel.id}>
                  {mapel.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat materi...</p>
        </div>
      ) : filteredMateri.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            {searchTerm || selectedMapel !== "all"
              ? "Tidak ada materi yang cocok dengan pencarian"
              : "Belum ada materi tersedia"}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMateri.map((m) => (
            <Card
              key={m.id}
              className="overflow-hidden border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => handleViewMateri(m.id)}
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-orange-400 to-orange-600 overflow-hidden">
                {m.thumbnail_url ? (
                  <img
                    src={m.thumbnail_url}
                    alt={m.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center p-6">
                      <BookOpen size={48} className="mx-auto mb-2 opacity-80" />
                      <h3 className="text-xl font-bold line-clamp-2">
                        {m.title}
                      </h3>
                    </div>
                  </div>
                )}
                {/* Progress indicator on thumbnail */}
                {m.progress !== undefined && m.progress > 0 && (
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-orange-600">
                    {m.progress}%
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                  {m.title}
                </h3>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">Progress</span>
                    <span className="font-bold text-gray-900">
                      {m.progress || 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${m.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="overview" className="text-xs">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="learn" className="text-xs">
                      Lanjut Belajar
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="mt-3">
                    <div className="space-y-2 text-sm">
                      {m.mapel && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <BookOpen size={14} />
                          <span className="line-clamp-1">{m.mapel.name}</span>
                        </div>
                      )}
                      {m.profiles && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User size={14} />
                          <span className="line-clamp-1">
                            {m.profiles.full_name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={14} />
                        <span>
                          {new Date(m.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="learn" className="mt-3">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewMateri(m.id);
                      }}
                    >
                      <Play size={16} className="mr-2" />
                      Mulai Belajar
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
