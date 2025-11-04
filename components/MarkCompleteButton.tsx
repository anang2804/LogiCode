/**
 * Example Component: Button "Tandai Selesai & Lanjut" untuk Sub-Bab Materi
 *
 * Letakkan button ini di akhir setiap sub-bab yang dibaca siswa
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface MarkCompleteButtonProps {
  subBabId: string;
  subBabTitle: string;
  isCompleted: boolean;
  onCompleteAction: () => void; // Callback untuk navigasi ke sub-bab berikutnya
}

export function MarkCompleteButton({
  subBabId,
  subBabTitle,
  isCompleted: initialCompleted,
  onCompleteAction,
}: MarkCompleteButtonProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function handleMarkComplete() {
    setLoading(true);
    try {
      const response = await fetch("/api/siswa/materi-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub_bab_id: subBabId,
          completed: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan progress");
      }

      setIsCompleted(true);
      toast.success("Sub-bab ditandai selesai! ✓");

      // Show progress update
      if (data.materi_progress) {
        const { completed_sub_bab, total_sub_bab, progress_percentage } =
          data.materi_progress;
        toast.info(
          `Progress: ${completed_sub_bab}/${total_sub_bab} sub-bab (${progress_percentage}%)`
        );
      }

      // Navigate to next sub-bab after short delay
      setTimeout(() => {
        onCompleteAction();
      }, 1000);
    } catch (error: any) {
      console.error("Error marking complete:", error);
      toast.error(error.message || "Gagal menyimpan progress");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnmark() {
    setLoading(true);
    try {
      const response = await fetch("/api/siswa/materi-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub_bab_id: subBabId,
          completed: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal update progress");
      }

      setIsCompleted(false);
      toast.success("Tandai selesai dibatalkan");
    } catch (error: any) {
      console.error("Error unmarking:", error);
      toast.error(error.message || "Gagal update progress");
    } finally {
      setLoading(false);
    }
  }

  if (isCompleted) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
            <Check className="text-white" size={18} />
          </div>
          <div>
            <p className="font-semibold text-green-900">Sub-bab Selesai</p>
            <p className="text-sm text-green-700">
              Anda sudah menyelesaikan "{subBabTitle}"
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnmark}
          disabled={loading}
          className="border-green-600 text-green-600 hover:bg-green-50"
        >
          Batalkan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center p-6 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg">
      <Button
        onClick={handleMarkComplete}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold"
        size="lg"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
            Menyimpan...
          </>
        ) : (
          <>
            <Check size={24} className="mr-3" />
            Tandai Selesai & Lanjut
            <ChevronRight size={24} className="ml-3" />
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * CARA PENGGUNAAN:
 *
 * 1. Import component ini di halaman materi siswa
 * 2. Letakkan di akhir konten setiap sub-bab
 * 3. Pass props yang diperlukan
 *
 * Example:
 *
 * <MarkCompleteButton
 *   subBabId="uuid-sub-bab-123"
 *   subBabTitle="1.1 Pengenalan Pemrograman"
 *   isCompleted={completedSubBabs.includes("uuid-sub-bab-123")}
 *   onCompleteAction={() => {
 *     // Navigate to next sub-bab
 *     router.push(`/siswa/materi/${materiId}/sub-bab/${nextSubBabId}`);
 *   }}
 * />
 */
