"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Search, Plus, Trash2, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  kelas?: string;
  jurusan?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: string;
  no_telepon?: string;
  alamat?: string;
  created_at?: string;
}

interface KelasOption {
  id: string;
  name: string;
}

export default function AdminAkunPage() {
  const [activeTab, setActiveTab] = useState<"siswa" | "guru">("siswa");
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [teachers, setTeachers] = useState<StudentProfile[]>([]); // Reuse same interface for guru
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>(
    []
  );
  const [filteredTeachers, setFilteredTeachers] = useState<StudentProfile[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Form untuk tambah user baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [formFullName, setFormFullName] = useState("");
  const [formKelas, setFormKelas] = useState("");
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk created accounts dengan temporary password
  const [createdAccounts, setCreatedAccounts] = useState<
    Array<{
      id?: string;
      full_name: string;
      email: string;
      temporaryPassword?: string;
    }>
  >([]);

  const [sessionCreatedAccounts, setSessionCreatedAccounts] = useState<
    Array<{
      id?: string;
      full_name: string;
      email: string;
      temporaryPassword?: string;
    }>
  >([]);

  // State untuk tracking password yang sudah diganti
  const [passwordChangedStatus, setPasswordChangedStatus] = useState<
    Map<string, { changed: boolean; lastChange?: string }>
  >(new Map());

  // State untuk menyimpan password terbaru user
  const [userPasswords, setUserPasswords] = useState<
    Map<string, { password: string; updatedAt: string }>
  >(new Map());

  // Helper functions
  const normalizeEmail = (e?: string) =>
    e ? String(e).trim().toLowerCase() : "";

  const extractTemp = (it: any) => {
    return (
      it?.temporaryPassword ||
      it?.temporary_password ||
      it?.tempPassword ||
      it?.password ||
      it?.pw ||
      it?.temp ||
      ""
    );
  };

  const hasTemporaryFor = (opts: { id?: string; email?: string }) => {
    const e = normalizeEmail(opts.email || "");
    const byLists = [...sessionCreatedAccounts, ...createdAccounts];
    if (
      byLists.some(
        (p) =>
          (opts.id && p.id === opts.id) ||
          (p.email &&
            normalizeEmail(p.email) === e &&
            (p.temporaryPassword || "").length > 0)
      )
    )
      return true;
    // fallback: check raw localStorage
    try {
      const raw = localStorage.getItem("admin_created_accounts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            const pid = p?.id || null;
            const pe = normalizeEmail(p?.email);
            const pw = extractTemp(p);
            if (opts.id && pid && String(pid) === String(opts.id) && pw)
              return true;
            if (pe && e && pe === e && pw) return true;
          }
        }
      }
    } catch (e2) {
      /* ignore */
    }
    return false;
  };

  // Get temporary password untuk user tertentu
  const getTemporaryPassword = (opts: {
    id?: string;
    email?: string;
  }): string => {
    const e = normalizeEmail(opts.email || "");

    // Check localStorage first (prioritas tertinggi)
    try {
      const raw = localStorage.getItem("admin_created_accounts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            const pid = p?.id || null;
            const pe = normalizeEmail(p?.email);
            const pw = extractTemp(p);
            if (opts.id && pid && String(pid) === String(opts.id) && pw)
              return pw;
            if (pe && e && pe === e && pw) return pw;
          }
        }
      }
    } catch (e2) {
      /* ignore */
    }

    // Check state lists
    const byLists = [...sessionCreatedAccounts, ...createdAccounts];
    for (const p of byLists) {
      if (
        (opts.id && p.id === opts.id) ||
        (p.email && normalizeEmail(p.email) === e)
      ) {
        const pw = p.temporaryPassword || "";
        if (pw) return pw;
      }
    }

    return "";
  };

  // Load created accounts dari localStorage - langsung saat mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin_created_accounts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((p: any) => ({
            id: p?.id || null,
            full_name: p?.full_name || "",
            email: normalizeEmail(p?.email || ""),
            temporaryPassword: extractTemp(p) || "",
          }));
          setCreatedAccounts(normalized);
          setSessionCreatedAccounts(normalized);
          console.log("✅ Loaded persisted accounts:", normalized.length);
        }
      }
    } catch (e) {
      console.warn("Failed to load created accounts", e);
    }
  }, []);

  // Save created accounts ke localStorage setiap kali berubah
  useEffect(() => {
    if (createdAccounts.length > 0) {
      try {
        localStorage.setItem(
          "admin_created_accounts",
          JSON.stringify(createdAccounts)
        );
        console.log("💾 Saved to localStorage:", createdAccounts.length);
      } catch (e) {
        console.warn("Failed to save created accounts", e);
      }
    }
  }, [createdAccounts]);

  useEffect(() => {
    fetchStudents();
    fetchKelas();
  }, []);

  // Get user's current password
  const getUserPassword = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/get-user-password?t=" + Date.now(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        body: JSON.stringify({ userId }),
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.password) {
          setUserPasswords((prev) => {
            const newMap = new Map(prev);
            newMap.set(userId, {
              password: json.password,
              updatedAt: json.updatedAt,
            });
            return newMap;
          });
        }
      }
    } catch (error) {
      console.error(`Error getting user password:`, error);
    }
  };

  // Check password status untuk semua user
  const checkPasswordStatus = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    try {
      const res = await fetch(
        "/api/admin/check-password-status?t=" + Date.now(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          body: JSON.stringify({ userIds }),
          cache: "no-store",
        }
      );

      if (res.ok) {
        const json = await res.json();
        const statusMap = new Map();
        const passwordPromises = [];

        for (const result of json.results || []) {
          statusMap.set(result.id, {
            changed: result.passwordChanged,
            lastChange: result.lastPasswordChange,
          });

          // Jika password sudah diganti, ambil password terbaru
          if (result.passwordChanged) {
            passwordPromises.push(getUserPassword(result.id));
          }
        }

        setPasswordChangedStatus(statusMap);

        // Wait untuk semua password fetch selesai
        await Promise.all(passwordPromises);
        console.log("✅ Password status & passwords loaded");
      }
    } catch (error) {
      console.error("Error checking password status:", error);
    }
  };

  // Force refresh semua password data
  const refreshAllPasswordData = async () => {
    const allIds = [...students.map((s) => s.id), ...teachers.map((t) => t.id)];

    if (allIds.length > 0) {
      console.log(
        "🔄 Force refreshing all password data for",
        allIds.length,
        "users"
      );

      // Reset states
      setPasswordChangedStatus(new Map());
      setUserPasswords(new Map());

      // Fetch fresh data
      await checkPasswordStatus(allIds);
    }
  };

  // Check status setiap kali students/teachers berubah
  useEffect(() => {
    const allIds = [...students.map((s) => s.id), ...teachers.map((t) => t.id)];
    if (allIds.length > 0) {
      checkPasswordStatus(allIds);
    }
  }, [students, teachers]);

  // Auto-refresh status setiap 15 detik
  useEffect(() => {
    const interval = setInterval(() => {
      const allIds = [
        ...students.map((s) => s.id),
        ...teachers.map((t) => t.id),
      ];
      if (allIds.length > 0) {
        checkPasswordStatus(allIds);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [students, teachers]);

  // Auto-load passwords untuk SEMUA user saat data students/teachers berubah
  useEffect(() => {
    const allUserIds = [
      ...students.map((s) => s.id),
      ...teachers.map((t) => t.id),
    ];

    if (allUserIds.length > 0) {
      // Load password untuk setiap user
      allUserIds.forEach((userId) => {
        getUserPassword(userId);
      });
    }
  }, [students, teachers]);

  // Auto-load passwords for users yang sudah ganti password (dari status check)
  useEffect(() => {
    const usersWithChangedPassword: string[] = [];

    passwordChangedStatus.forEach((status, userId) => {
      if (status.changed && !userPasswords.has(userId)) {
        usersWithChangedPassword.push(userId);
      }
    });

    if (usersWithChangedPassword.length > 0) {
      usersWithChangedPassword.forEach((userId) => {
        getUserPassword(userId);
      });
    }
  }, [passwordChangedStatus]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredStudents(students);
      setFilteredTeachers(teachers);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredStudents(
        students.filter(
          (s) =>
            s.full_name?.toLowerCase().includes(term) ||
            s.email?.toLowerCase().includes(term) ||
            s.kelas?.toLowerCase().includes(term)
        )
      );
      setFilteredTeachers(
        teachers.filter(
          (t) =>
            t.full_name?.toLowerCase().includes(term) ||
            t.email?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, students, teachers]);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // Fetch siswa
      const resSiswa = await fetch("/api/admin/siswa");
      const jsonSiswa = await resSiswa.json();
      if (!resSiswa.ok)
        throw new Error(jsonSiswa.error || "Failed to fetch siswa");
      const dataSiswa = jsonSiswa.data || [];

      setStudents(dataSiswa);
      setFilteredStudents(dataSiswa);

      // Fetch guru
      let dataGuru: any[] = [];
      const resGuru = await fetch("/api/admin/guru");
      const jsonGuru = await resGuru.json();
      if (!resGuru.ok) {
        console.error("Error fetching teachers:", jsonGuru.error);
        setTeachers([]);
        setFilteredTeachers([]);
      } else {
        dataGuru = jsonGuru.data || [];
        setTeachers(dataGuru);
        setFilteredTeachers(dataGuru);
      }

      // Merge dengan persisted accounts - JANGAN overwrite, hanya enrich
      setCreatedAccounts((prev) => {
        if (prev.length === 0) return prev; // Jika kosong, biarkan saja

        const allData = [...dataSiswa, ...dataGuru];
        const byEmail = new Map(
          allData.map((s: any) => [normalizeEmail(s.email), s])
        );
        const byId = new Map(allData.map((s: any) => [s.id, s]));

        // Update prev dengan data terbaru dari fetch, tapi PERTAHANKAN temporaryPassword
        const enriched = prev.map((p: any) => {
          const emailKey = normalizeEmail(p?.email || "");

          if (p?.id && byId.has(p.id)) {
            const prof = byId.get(p.id) as any;
            return {
              ...p,
              id: prof.id,
              full_name: prof.full_name,
              email: prof.email,
              // PERTAHANKAN temporaryPassword dari prev
              temporaryPassword: p.temporaryPassword || "",
            };
          }

          if (emailKey && byEmail.has(emailKey)) {
            const prof = byEmail.get(emailKey) as any;
            return {
              ...p,
              id: prof.id,
              full_name: prof.full_name,
              email: prof.email,
              // PERTAHANKAN temporaryPassword dari prev
              temporaryPassword: p.temporaryPassword || "",
            };
          }

          // Tidak ada match, pertahankan as-is
          return p;
        });

        console.log("🔄 Enriched accounts after fetch:", enriched.length);
        return enriched;
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchKelas = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("kelas")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching kelas:", error);
        return;
      }

      setKelasOptions(data || []);
    } catch (error) {
      console.error("Error fetching kelas:", error);
    }
  };

  // Handle tambah user baru (siswa atau guru)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (activeTab === "siswa") {
        // Create siswa
        const res = await fetch("/api/admin/siswa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: formFullName,
            kelas: formKelas || null,
            sendEmail: false,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal membuat siswa");

        // Simpan temporary password
        const newEntry = {
          id: json.id,
          full_name: formFullName,
          email: json.email || "",
          temporaryPassword: json.temporaryPassword || "",
        };

        setCreatedAccounts((prev) => {
          const next = [newEntry, ...prev];
          localStorage.setItem("admin_created_accounts", JSON.stringify(next));
          return next;
        });
        setSessionCreatedAccounts((prev) => [newEntry, ...prev]);
        alert(
          "Akun siswa berhasil dibuat. Lihat tabel di bawah untuk password sementara."
        );
      } else {
        // Create guru - similar to siswa but with guru role
        const res = await fetch("/api/admin/guru", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: formFullName, sendEmail: false }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal membuat guru");

        const newEntry = {
          id: json.id,
          full_name: formFullName,
          email: json.email || "",
          temporaryPassword: json.temporaryPassword || "",
        };

        setCreatedAccounts((prev) => {
          const next = [newEntry, ...prev];
          localStorage.setItem("admin_created_accounts", JSON.stringify(next));
          return next;
        });
        setSessionCreatedAccounts((prev) => [newEntry, ...prev]);
        alert(
          "Akun guru berhasil dibuat. Lihat tabel di bawah untuk password sementara."
        );
      }

      setShowAddForm(false);
      setFormFullName("");
      setFormKelas("");
      await fetchStudents();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user (siswa atau guru)
  const handleDelete = async (id: string, isGuru: boolean = false) => {
    const userType = isGuru ? "guru" : "siswa";
    if (!confirm(`Hapus ${userType} ini? Tindakan tidak bisa dibatalkan.`))
      return;

    try {
      const endpoint = isGuru
        ? `/api/admin/guru?id=${id}`
        : `/api/admin/siswa?id=${id}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Gagal menghapus ${userType}`);

      await fetchStudents();
      alert(`${isGuru ? "Guru" : "Siswa"} berhasil dihapus`);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    }
  };

  // Download PDF
  const downloadPdf = (
    items: Array<{
      full_name: string;
      email: string;
      temporaryPassword?: string;
    }>,
    title?: string
  ) => {
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };

    const rows = items
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.full_name)}</td><td>${escapeHtml(
            i.email
          )}</td><td>${escapeHtml(i.temporaryPassword || "")}</td></tr>`
      )
      .join("");

    const pdfTitle =
      title || `Daftar Akun ${activeTab === "siswa" ? "Siswa" : "Guru"}`;

    const html = `
      <html>
        <head>
          <title>${escapeHtml(pdfTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px }
            table { border-collapse: collapse; width: 100% }
            th, td { border: 1px solid #ddd; padding: 8px }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(pdfTitle)}</h2>
          <table>
            <thead>
              <tr><th>Nama</th><th>Email</th><th>Password Sementara</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Tidak bisa membuka jendela baru. Izinkan pop-up lalu coba lagi.");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 500);
  };

  const clearCreatedAccounts = () => {
    if (!confirm("Hapus daftar akun baru yang tersimpan?")) return;
    try {
      localStorage.removeItem("admin_created_accounts");
    } catch (e) {
      console.warn("Failed to remove created accounts", e);
    }
    setCreatedAccounts([]);
    setSessionCreatedAccounts([]);
  };

  // Generate password sementara untuk akun yang belum punya
  const generatePasswordFor = async (
    accountId: string,
    isGuru: boolean = false
  ) => {
    if (hasTemporaryFor({ id: accountId })) {
      alert("Password sementara untuk akun ini sudah ada.");
      return;
    }

    if (!confirm("Buat password sementara untuk akun ini?")) return;

    try {
      const endpoint = isGuru
        ? "/api/admin/guru/reset-passwords"
        : "/api/admin/siswa/reset-passwords";

      console.log(`🔐 Generating password for ${accountId} via ${endpoint}`);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [accountId] }),
      });

      console.log(`📡 Response status: ${res.status}`);

      if (!res.ok) {
        const json = await res.json();
        console.error("❌ API Error:", json);
        throw new Error(json.error || "Gagal membuat password");
      }

      const json = await res.json();
      console.log("✅ API Response:", json);

      const r = (json.results || [])[0];
      const pw = r?.temporaryPassword;

      if (pw) {
        // Cari data user dari students atau teachers
        const userData = isGuru
          ? teachers.find((t) => t.id === accountId)
          : students.find((s) => s.id === accountId);

        setCreatedAccounts((prev) => {
          // Cek apakah akun sudah ada di list
          const existingIndex = prev.findIndex((p) => p.id === accountId);

          let next;
          if (existingIndex >= 0) {
            // Update existing entry
            next = prev.map((p) =>
              p.id === accountId ? { ...p, temporaryPassword: pw } : p
            );
          } else {
            // Tambahkan entry baru
            const newEntry = {
              id: accountId,
              full_name: userData?.full_name || "",
              email: userData?.email || r?.email || "",
              temporaryPassword: pw,
            };
            next = [newEntry, ...prev];
          }

          localStorage.setItem("admin_created_accounts", JSON.stringify(next));
          return next;
        });

        setSessionCreatedAccounts((prev) => {
          const existingIndex = prev.findIndex((p) => p.id === accountId);
          if (existingIndex >= 0) {
            return prev.map((p) =>
              p.id === accountId ? { ...p, temporaryPassword: pw } : p
            );
          } else {
            const newEntry = {
              id: accountId,
              full_name: userData?.full_name || "",
              email: userData?.email || r?.email || "",
              temporaryPassword: pw,
            };
            return [newEntry, ...prev];
          }
        });

        alert("Password sementara berhasil dibuat.");
        await fetchStudents();
      } else {
        console.warn("⚠️ No password returned from API");
        alert("Password tidak berhasil dibuat. Coba lagi.");
      }
    } catch (err: any) {
      console.error("❌ Error generating password:", err);
      alert(err.message || "Terjadi kesalahan: " + err.toString());
    }
  };

  // Generate password sementara untuk SEMUA akun sekaligus
  const generateAllPasswords = async (onlyCurrentTab: boolean = false) => {
    // Kumpulkan semua ID yang belum punya password
    const siswaIds: string[] = [];
    const guruIds: string[] = [];

    // Cek siswa (hanya jika tidak dibatasi atau tab aktif adalah siswa)
    if (!onlyCurrentTab || activeTab === "siswa") {
      for (const s of students) {
        if (!hasTemporaryFor({ id: s.id, email: s.email })) {
          siswaIds.push(s.id);
        }
      }
    }

    // Cek guru (hanya jika tidak dibatasi atau tab aktif adalah guru)
    if (!onlyCurrentTab || activeTab === "guru") {
      for (const t of teachers) {
        if (!hasTemporaryFor({ id: t.id, email: t.email })) {
          guruIds.push(t.id);
        }
      }
    }

    const totalCount = siswaIds.length + guruIds.length;

    if (totalCount === 0) {
      alert(
        onlyCurrentTab
          ? `Semua akun ${activeTab} sudah memiliki password sementara.`
          : "Semua akun sudah memiliki password sementara."
      );
      return;
    }

    const confirmMessage = onlyCurrentTab
      ? `Buat password sementara untuk ${totalCount} akun ${activeTab}?`
      : `Buat password sementara untuk ${totalCount} akun (${siswaIds.length} siswa, ${guruIds.length} guru)?`;

    if (!confirm(confirmMessage)) return;

    try {
      let successCount = 0;
      const allResults: Array<{
        id: string;
        email?: string;
        temporaryPassword?: string;
      }> = [];

      // Generate untuk siswa
      if (siswaIds.length > 0) {
        const res = await fetch("/api/admin/siswa/reset-passwords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: siswaIds }),
        });

        const json = await res.json();
        if (res.ok) {
          const results = json.results || [];
          allResults.push(...results);
          successCount += results.filter(
            (r: any) => r.temporaryPassword
          ).length;
        }
      }

      // Generate untuk guru
      if (guruIds.length > 0) {
        const res = await fetch("/api/admin/guru/reset-passwords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: guruIds }),
        });

        const json = await res.json();
        if (res.ok) {
          const results = json.results || [];
          allResults.push(...results);
          successCount += results.filter(
            (r: any) => r.temporaryPassword
          ).length;
        }
      }

      // Update created accounts dengan password baru
      if (allResults.length > 0) {
        setCreatedAccounts((prev) => {
          const resultById = new Map(
            allResults.map((r) => [r.id, r.temporaryPassword])
          );
          const resultByEmail = new Map(
            allResults.map((r) => [
              normalizeEmail(r.email),
              r.temporaryPassword,
            ])
          );

          // Update existing entries
          const updated = prev.map((p) => {
            if (p.id && resultById.has(p.id)) {
              return { ...p, temporaryPassword: resultById.get(p.id) || "" };
            }
            if (p.email && resultByEmail.has(normalizeEmail(p.email))) {
              return {
                ...p,
                temporaryPassword:
                  resultByEmail.get(normalizeEmail(p.email)) || "",
              };
            }
            return p;
          });

          // Add new entries untuk akun yang belum ada di list
          const existingIds = new Set(prev.map((p) => p.id));
          const existingEmails = new Set(
            prev.map((p) => normalizeEmail(p.email))
          );

          for (const r of allResults) {
            if (r.temporaryPassword) {
              const matchStudent = students.find((s) => s.id === r.id);
              const matchTeacher = teachers.find((t) => t.id === r.id);
              const match = matchStudent || matchTeacher;

              if (
                match &&
                !existingIds.has(r.id) &&
                !existingEmails.has(normalizeEmail(r.email))
              ) {
                updated.push({
                  id: r.id,
                  full_name: match.full_name || "",
                  email: r.email || match.email || "",
                  temporaryPassword: r.temporaryPassword,
                });
              }
            }
          }

          localStorage.setItem(
            "admin_created_accounts",
            JSON.stringify(updated)
          );
          return updated;
        });

        setSessionCreatedAccounts((prev) => {
          const resultById = new Map(
            allResults.map((r) => [r.id, r.temporaryPassword])
          );
          return prev.map((p) => {
            if (p.id && resultById.has(p.id)) {
              return { ...p, temporaryPassword: resultById.get(p.id) || "" };
            }
            return p;
          });
        });
      }

      alert(
        `Berhasil membuat password sementara untuk ${successCount} dari ${totalCount} akun.`
      );
      await fetchStudents();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    }
  };

  // Build combined list untuk unduh semua akun (sesuai tab aktif)
  // PRIORITAS: localStorage > sessionCreatedAccounts > default
  const combinedDownloadList = (() => {
    // Baca langsung dari localStorage untuk memastikan data terbaru
    let persistedMap = new Map<string, string>();
    try {
      const raw = localStorage.getItem("admin_created_accounts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            const pw = extractTemp(p);
            if (pw) {
              if (p?.id) persistedMap.set(`id:${p.id}`, pw);
              if (p?.email)
                persistedMap.set(`email:${normalizeEmail(p.email)}`, pw);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to read persisted passwords", e);
    }

    const tempByEmail = new Map<string, string>();
    const tempById = new Map<string, string>();

    const add = (it: any) => {
      const pw = extractTemp(it);
      const emailKey = normalizeEmail(it.email);
      if (emailKey) tempByEmail.set(emailKey, pw || "");
      if (it.id) tempById.set(String(it.id), pw || "");
    };

    for (const it of sessionCreatedAccounts) add(it);
    for (const it of createdAccounts) add(it);

    const list: Array<{
      id?: string;
      full_name: string;
      email: string;
      temporaryPassword?: string;
    }> = [];
    const seenEmails = new Set<string>();

    // Add students (hanya jika tab siswa aktif)
    if (activeTab === "siswa") {
      for (const s of students) {
        const email = s.email || "";
        const id = s.id;

        // PRIORITAS: persisted localStorage > memory maps
        let pw =
          persistedMap.get(`id:${id}`) ||
          persistedMap.get(`email:${normalizeEmail(email)}`) ||
          (id && tempById.get(String(id))) ||
          tempByEmail.get(normalizeEmail(email)) ||
          "";

        seenEmails.add(normalizeEmail(email));
        list.push({
          id,
          full_name: s.full_name || "",
          email,
          temporaryPassword: pw,
        });
      }
    }

    // Add teachers (hanya jika tab guru aktif)
    if (activeTab === "guru") {
      for (const t of teachers) {
        const email = t.email || "";
        const id = t.id;

        // PRIORITAS: persisted localStorage > memory maps
        let pw =
          persistedMap.get(`id:${id}`) ||
          persistedMap.get(`email:${normalizeEmail(email)}`) ||
          (id && tempById.get(String(id))) ||
          tempByEmail.get(normalizeEmail(email)) ||
          "";

        seenEmails.add(normalizeEmail(email));
        list.push({
          id,
          full_name: t.full_name || "",
          email,
          temporaryPassword: pw,
        });
      }
    }

    // Include any created accounts not yet in students/teachers (sesuai tab)
    for (const c of [...sessionCreatedAccounts, ...createdAccounts]) {
      const email = c.email || "";
      const id = c.id;
      if (!email && !id) continue;
      if (email && seenEmails.has(normalizeEmail(email))) continue;
      if (id && list.some((x) => x.id === id)) continue;

      // Cek apakah akun ini termasuk di tab yang aktif
      const isInStudents = students.some(
        (s) => s.id === id || normalizeEmail(s.email) === normalizeEmail(email)
      );
      const isInTeachers = teachers.some(
        (t) => t.id === id || normalizeEmail(t.email) === normalizeEmail(email)
      );

      // Hanya tambahkan jika sesuai dengan tab aktif
      if (
        (activeTab === "siswa" && isInStudents) ||
        (activeTab === "guru" && isInTeachers)
      ) {
        list.push({
          id,
          full_name: c.full_name || "",
          email,
          temporaryPassword: c.temporaryPassword || "",
        });
      }
    }

    return list;
  })();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat data akun siswa...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Akun</h1>
          <p className="text-gray-600 mt-1">
            Tambah user baru dan kelola password akun siswa & guru
          </p>
          <p className="text-xs text-gray-500 mt-1">
            💡 Edit profil dilakukan di menu Siswa/Guru | Status:{" "}
            {passwordChangedStatus.size} users tracked | {userPasswords.size}{" "}
            passwords loaded
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus size={16} /> Tambah {activeTab === "siswa" ? "Siswa" : "Guru"}
          </Button>
          <Button
            onClick={() => generateAllPasswords(true)}
            variant="outline"
            className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            Buat Password Semua {activeTab === "siswa" ? "Siswa" : "Guru"}
          </Button>
          <Button
            onClick={refreshAllPasswordData}
            variant="outline"
            className="flex items-center gap-2"
            title="Refresh semua data password (paksa reload dari database)"
          >
            🔄 Refresh Semua
          </Button>
          <div className="flex items-center gap-2">
            <Users className="text-green-600" size={32} />
            <span className="text-2xl font-bold text-green-600">
              {activeTab === "siswa" ? students.length : teachers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Menu */}
      <Card className="p-1 mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setActiveTab("siswa");
              setSearchTerm("");
            }}
            className={`flex-1 px-4 py-3 rounded font-medium transition ${
              activeTab === "siswa"
                ? "bg-green-600 text-white"
                : "bg-transparent text-gray-600 hover:bg-gray-100"
            }`}
          >
            Siswa ({students.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("guru");
              setSearchTerm("");
            }}
            className={`flex-1 px-4 py-3 rounded font-medium transition ${
              activeTab === "guru"
                ? "bg-green-600 text-white"
                : "bg-transparent text-gray-600 hover:bg-gray-100"
            }`}
          >
            Guru ({teachers.length})
          </button>
        </div>
      </Card>

      {/* Form Tambah User */}
      {showAddForm && (
        <Card className="p-6 mb-6 border-green-200">
          <form onSubmit={handleAddUser} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Tambah {activeTab === "siswa" ? "Siswa" : "Guru"} Baru
            </h3>
            <div>
              <Label htmlFor="add_full_name">Nama Lengkap *</Label>
              <Input
                id="add_full_name"
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
                placeholder={`Nama lengkap ${
                  activeTab === "siswa" ? "siswa" : "guru"
                }`}
                required
              />
            </div>
            {activeTab === "siswa" && (
              <div>
                <Label htmlFor="add_kelas">Kelas (Opsional)</Label>
                <select
                  id="add_kelas"
                  value={formKelas}
                  onChange={(e) => setFormKelas(e.target.value)}
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
            )}
            <div className="text-sm text-gray-600">
              Email akan dibuat otomatis berdasarkan nama. Password sementara
              akan dibuat otomatis;
              {activeTab === "siswa" ? "siswa" : "guru"} diminta mengganti
              password saat pertama kali masuk.
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Memproses..."
                  : `Buat ${activeTab === "siswa" ? "Siswa" : "Guru"}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormFullName("");
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search Bar */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            type="text"
            placeholder="Cari berdasarkan nama, email, atau kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Users List */}
      <div className="space-y-2">
        {activeTab === "siswa" && filteredStudents.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-500">
              {searchTerm
                ? "Tidak ada siswa yang cocok dengan pencarian"
                : "Belum ada data siswa"}
            </p>
          </Card>
        ) : activeTab === "guru" && filteredTeachers.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-500">
              {searchTerm
                ? "Tidak ada guru yang cocok dengan pencarian"
                : "Belum ada data guru"}
            </p>
          </Card>
        ) : (
          (activeTab === "siswa" ? filteredStudents : filteredTeachers).map(
            (student) => (
              <Card key={student.id} className="p-4">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {student.full_name}
                      </h3>
                      <p className="text-xs text-gray-500">{student.email}</p>
                      {student.created_at && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <Calendar size={12} />
                          {new Date(student.created_at).toLocaleDateString(
                            "id-ID"
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() =>
                        handleDelete(student.id, activeTab === "guru")
                      }
                      variant="destructive"
                      size="sm"
                      className="h-8"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  {/* Password Sementara & Status */}
                  {(() => {
                    const tempPassword = getTemporaryPassword({
                      id: student.id,
                      email: student.email,
                    });
                    const hasPassword = tempPassword.length > 0;
                    const passwordStatus = passwordChangedStatus.get(
                      student.id
                    );
                    const currentPassword = userPasswords.get(student.id);

                    // User dianggap sudah ganti password jika:
                    // 1. Ada currentPassword di database DAN berbeda dari tempPassword
                    // 2. ATAU passwordStatus.changed = true
                    const hasChangedPassword =
                      passwordStatus?.changed ||
                      (currentPassword &&
                        currentPassword.password &&
                        currentPassword.password !== tempPassword);

                    return (
                      <div className="border-t pt-2 mt-2">
                        <div className="flex flex-col gap-2">
                          {/* Password Sementara */}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Password Sementara
                            </p>
                            {hasPassword ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-xs font-mono bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                                  {tempPassword}
                                </code>
                                {hasChangedPassword ? (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded flex items-center gap-1">
                                    ✓ Sudah diganti
                                    {passwordStatus?.lastChange && (
                                      <span className="text-gray-500 text-xs">
                                        (
                                        {new Date(
                                          passwordStatus.lastChange
                                        ).toLocaleDateString("id-ID")}
                                        )
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded">
                                    ⚠ Belum diganti
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {hasChangedPassword ? (
                                  <span className="text-xs text-green-600 flex items-center gap-1">
                                    ✓ User sudah mengatur password sendiri
                                  </span>
                                ) : (
                                  <>
                                    <span className="text-xs text-gray-400">
                                      Belum ada
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        generatePasswordFor(
                                          student.id,
                                          activeTab === "guru"
                                        )
                                      }
                                      className="text-xs h-6 px-2"
                                    >
                                      Buat
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Password Terbaru - tampilkan jika ada data di database */}
                          {(hasChangedPassword || currentPassword) && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                {currentPassword &&
                                currentPassword.password !== tempPassword
                                  ? "Password Terbaru (Diganti User)"
                                  : "Password dari Database"}
                              </p>
                              {currentPassword ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                    {currentPassword.password}
                                  </code>
                                  {currentPassword.updatedAt && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(
                                        currentPassword.updatedAt
                                      ).toLocaleString("id-ID", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })}
                                    </span>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => getUserPassword(student.id)}
                                    className="text-xs h-6 px-2"
                                    title="Refresh password"
                                  >
                                    🔄
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">
                                    Loading...
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => getUserPassword(student.id)}
                                    className="text-xs h-6 px-2"
                                  >
                                    Muat
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            )
          )
        )}
      </div>

      {/* Tabel Akun Baru dengan Password Sementara */}
      {(() => {
        // Filter createdAccounts berdasarkan activeTab
        const filteredCreatedAccounts = createdAccounts.filter((acc) => {
          const isInStudents = students.some(
            (s) =>
              s.id === acc.id ||
              normalizeEmail(s.email) === normalizeEmail(acc.email)
          );
          const isInTeachers = teachers.some(
            (t) =>
              t.id === acc.id ||
              normalizeEmail(t.email) === normalizeEmail(acc.email)
          );

          return (
            (activeTab === "siswa" && isInStudents) ||
            (activeTab === "guru" && isInTeachers)
          );
        });

        const filteredSessionAccounts = sessionCreatedAccounts.filter((acc) => {
          const isInStudents = students.some(
            (s) =>
              s.id === acc.id ||
              normalizeEmail(s.email) === normalizeEmail(acc.email)
          );
          const isInTeachers = teachers.some(
            (t) =>
              t.id === acc.id ||
              normalizeEmail(t.email) === normalizeEmail(acc.email)
          );

          return (
            (activeTab === "siswa" && isInStudents) ||
            (activeTab === "guru" && isInTeachers)
          );
        });

        return (
          filteredCreatedAccounts.length > 0 && (
            <Card className="p-6 mt-8 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Akun {activeTab === "siswa" ? "Siswa" : "Guru"} Baru yang
                  Dibuat
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      downloadPdf(
                        filteredSessionAccounts.length > 0
                          ? filteredSessionAccounts
                          : filteredCreatedAccounts
                      )
                    }
                    variant="outline"
                  >
                    Unduh Baru
                  </Button>
                  <Button
                    onClick={() => downloadPdf(filteredCreatedAccounts)}
                    variant="outline"
                  >
                    Unduh Semua
                  </Button>
                  <Button onClick={clearCreatedAccounts} variant="ghost">
                    Kosongkan
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-3 py-2">Nama</th>
                      <th className="text-left px-3 py-2">Email</th>
                      <th className="text-left px-3 py-2">
                        Password Sementara
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCreatedAccounts.map((acc, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-3 py-2">{acc.full_name}</td>
                        <td className="px-3 py-2">{acc.email}</td>
                        <td className="px-3 py-2 font-mono text-green-600 flex items-center gap-3">
                          <span>{acc.temporaryPassword || ""}</span>
                          {!acc.temporaryPassword && acc.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                generatePasswordFor(
                                  acc.id!,
                                  activeTab === "guru"
                                )
                              }
                            >
                              Buat
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        );
      })()}

      {/* Tabel Semua Akun Siap Diunduh */}
      {combinedDownloadList.length > 0 && (
        <Card className="p-6 mt-8 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Semua Akun {activeTab === "siswa" ? "Siswa" : "Guru"} Siap
                Diunduh
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Daftar lengkap semua akun{" "}
                {activeTab === "siswa" ? "siswa" : "guru"} dengan password
                sementara (jika ada)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => generateAllPasswords(true)}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Buat Password Semua {activeTab === "siswa" ? "Siswa" : "Guru"}
              </Button>
              <Button
                onClick={() => downloadPdf(combinedDownloadList)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Unduh Semua {activeTab === "siswa" ? "Siswa" : "Guru"} (PDF)
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-3 py-2">Nama</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Password Sementara</th>
                </tr>
              </thead>
              <tbody>
                {combinedDownloadList.map((acc, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{acc.full_name}</td>
                    <td className="px-3 py-2">{acc.email}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-blue-600 flex-1">
                          {acc.temporaryPassword || "-"}
                        </span>
                        {acc.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const isGuru = teachers.some(
                                (t) => t.id === acc.id
                              );
                              generatePasswordFor(acc.id!, isGuru);
                            }}
                            disabled={!!acc.temporaryPassword}
                            className={
                              acc.temporaryPassword
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }
                          >
                            {acc.temporaryPassword ? "Sudah Ada" : "Buat"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
