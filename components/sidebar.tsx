"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Target,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  UserCog,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SidebarProps {
  role: "guru" | "siswa" | "admin";
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const menuItems = {
    guru: [
      { label: "Dashboard", href: "/guru/dashboard", icon: LayoutDashboard },
      { label: "Kelola Materi", href: "/guru/materi", icon: BookOpen },
      { label: "Kelola Asesmen", href: "/guru/asesmen", icon: ClipboardList },
      { label: "Kelola PjBL", href: "/guru/pjbl", icon: Target },
      { label: "Kelola Nilai", href: "/guru/nilai", icon: BarChart3 },
      { label: "Profil Saya", href: "/guru/profile", icon: UserCircle },
    ],
    siswa: [
      { label: "Dashboard", href: "/siswa/dashboard", icon: LayoutDashboard },
      { label: "Akses Materi", href: "/siswa/materi", icon: BookOpen },
      { label: "Akses Asesmen", href: "/siswa/asesmen", icon: ClipboardList },
      { label: "Akses PjBL", href: "/siswa/pjbl", icon: Target },
      { label: "Profil Saya", href: "/siswa/profile", icon: UserCircle },
    ],
    admin: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Mata Pelajaran", href: "/admin/mapel", icon: BookOpen },
      { label: "Kelas", href: "/admin/kelas", icon: Users },
      { label: "Guru", href: "/admin/guru", icon: Users },
      { label: "Siswa", href: "/admin/siswa", icon: Users },
      { label: "Manajemen Akun", href: "/admin/akun", icon: UserCog },
      { label: "Materi", href: "/admin/materi", icon: BookOpen },
      { label: "Asesmen", href: "/admin/asesmen", icon: ClipboardList },
      { label: "PjBL", href: "/admin/pjbl", icon: Target },
      { label: "Nilai", href: "/admin/nilai", icon: BarChart3 },
    ],
  };

  const items = menuItems[role];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-green-600 text-white rounded-lg"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-green-100 p-6 transition-transform duration-300 z-40 flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <span className="font-bold text-gray-900">Smart</span>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={() => setOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? "bg-green-100 text-green-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition">
            <Settings size={20} />
            <span>Pengaturan</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
          >
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
