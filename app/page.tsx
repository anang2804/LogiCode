"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Users, Target, BarChart3, Zap } from "lucide-react";

export default function LandingPage() {
  const [active, setActive] = useState<string>("home");

  useEffect(() => {
    const ids = ["features", "about"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActive(entry.target.id);
          }
        });
      },
      { root: null, rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    // If nothing is intersecting, fallback to home when near top
    const onScroll = () => {
      if (window.scrollY < 120) setActive("home");
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50 to-emerald-100">
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-16">
        {/* Header */}
        <header className="sticky top-2 z-40 bg-white/60 backdrop-blur-sm rounded-xl px-8 py-4 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                SL
              </div>
              <div>
                <div className="font-bold text-lg">Smart</div>
                <div className="text-xs text-gray-500">Learning Platform</div>
              </div>
            </div>
            <nav className="hidden sm:flex items-center gap-6">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md transition ${
                  active === "home"
                    ? "text-emerald-700 font-semibold"
                    : "text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                Beranda
              </Link>
              <a
                href="#features"
                className={`px-3 py-2 rounded-md transition ${
                  active === "features"
                    ? "text-emerald-700 font-semibold"
                    : "text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                Fitur
              </a>
              <a
                href="#about"
                className={`px-3 py-2 rounded-md transition ${
                  active === "about"
                    ? "text-emerald-700 font-semibold"
                    : "text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                Tentang
              </a>

              <Link href="/auth/login">
                <Button size="sm">Masuk</Button>
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="grid md:grid-cols-2 gap-10 items-center mt-16">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Platform Pembelajaran Modern
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mb-6">
              Kelola materi, asesmen, dan proyek dengan antarmuka yang
              sederhana, cepat, dan fokus pada pembelajaran.
            </p>
            <div className="flex gap-4">
              <Link href="/auth/login">
                <Button size="lg">Belajar Sekarang</Button>
              </Link>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-center h-64">
              <div className="text-emerald-600 font-bold">
                Mockup / Screenshot
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-24">
          <div className="-mx-6 px-6">
            <div className="w-full bg-emerald-50 py-28">
              <div className="max-w-7xl mx-auto">
                <div className="max-w-3xl mx-auto text-center mb-12">
                  <h3 className="mt-3 text-2xl md:text-3xl lg:text-4xl text-gray-900 font-extrabold">
                    Kuasai Dasar Algoritma dan Pemrograman dengan Pendekatan
                    Berbasis Proyek
                  </h3>
                  <p className="mt-4 text-lg text-gray-700">
                    Belajar jadi lebih interaktif, menyenangkan, dan terarah
                    dengan fitur-fitur dari LogiCode.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
                  {[
                    {
                      icon: <BookOpen className="w-6 h-6 text-emerald-600" />,
                      title: "Materi",
                    },
                    {
                      icon: <Zap className="w-6 h-6 text-emerald-600" />,
                      title: "Kuis",
                    },
                    {
                      icon: <Target className="w-6 h-6 text-emerald-600" />,
                      title: "Project",
                    },
                    {
                      icon: <BarChart3 className="w-6 h-6 text-emerald-600" />,
                      title: "Nilai",
                    },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl px-10 py-8 flex items-center gap-6 shadow-lg hover:shadow-xl transition-shadow border border-transparent"
                    >
                      <div className="p-4 rounded-lg bg-white/60 shadow-inner flex items-center justify-center">
                        <div className="bg-emerald-50 p-3 rounded-lg">
                          {f.icon}
                        </div>
                      </div>
                      <div className="text-emerald-700 font-semibold text-lg">
                        {f.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="about" className="mt-12">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Guru", desc: "Kelola kelas & materi" },
              { title: "Siswa", desc: "Belajar & ikuti tugas" },
              { title: "Admin", desc: "Kelola pengguna & setelan" },
            ].map((r, i) => (
              <Card key={i} className="p-6 text-center">
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {r.title}
                </div>
                <div className="text-sm text-gray-600 mb-4">{r.desc}</div>
                <Link href="/auth/login">
                  <Button variant="outline" size="sm">
                    Masuk
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 text-center">
          <div className="inline-block bg-emerald-500 text-white rounded-xl px-8 py-6">
            <div className="text-xl font-bold">Siap mulai?</div>
            <div className="mt-3">
              <Link href="/auth/login">
                <Button size="lg">Daftar Gratis</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white">
              SL
            </div>
            <div>
              <div className="font-semibold">Smart Learning Platform</div>
              <div className="text-xs text-gray-500">© 2025</div>
            </div>
          </div>

          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#">Kebijakan Privasi</a>
            <a href="#">Syarat Layanan</a>
            <a href="#">Hubungi Kami</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
