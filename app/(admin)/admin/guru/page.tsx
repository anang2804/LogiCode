"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Mail, Calendar, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminGuruPage() {
  const [guru, setGuru] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuru = async () => {
      try {
        const res = await fetch("/api/admin/guru");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to fetch guru");
        setGuru(json.data || []);
      } catch (error) {
        console.error("Error fetching guru:", error);
        setGuru([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGuru();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Guru</h1>
          <p className="text-gray-600 mt-2">
            Untuk menambah, mengedit, atau menghapus guru, gunakan halaman{" "}
            <Link
              href="/admin/akun"
              className="text-green-600 hover:underline font-medium"
            >
              Manajemen Akun
            </Link>
          </p>
        </div>
        <Link href="/admin/akun">
          <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <UserCog size={16} />
            Ke Manajemen Akun
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data guru...</p>
        </div>
      ) : guru.length === 0 ? (
        <Card className="p-12 text-center border-green-100">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Belum ada guru terdaftar.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {guru.map((g) => (
            <Card key={g.id} className="p-6 border-green-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {g.full_name}
                  </h3>
                  <div className="flex flex-col gap-2 mt-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      {g.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      Terdaftar:{" "}
                      {new Date(g.created_at).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  Guru
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
