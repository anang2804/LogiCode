"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Mail, Calendar, Phone, MapPin } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  kelas?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: string;
  no_telepon?: string;
  alamat?: string;
}

interface Kelas {
  id: string;
  name: string;
  wali_kelas?: {
    full_name: string;
    email: string;
  };
}

export default function SiswaProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const router = useRouter();

  // Form states
  const [formData, setFormData] = useState<Partial<Profile>>({});

  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    loadProfile();
    loadKelas();
  }, []);

  const loadProfile = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData(data);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      alert("Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  };

  const loadKelas = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("kelas")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      // Fetch wali kelas info for each kelas
      const kelasWithWali = await Promise.all(
        (data || []).map(async (k) => {
          if (k.wali_kelas_id) {
            const { data: waliKelas } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", k.wali_kelas_id)
              .maybeSingle();

            return { ...k, wali_kelas: waliKelas };
          }
          return k;
        })
      );

      setKelasList(kelasWithWali);
    } catch (error: any) {
      console.error("Error loading kelas:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          kelas: formData.kelas,
          tanggal_lahir: formData.tanggal_lahir,
          jenis_kelamin: formData.jenis_kelamin,
          no_telepon: formData.no_telepon,
          alamat: formData.alamat,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, ...formData });
      setEditMode(false);
      alert("Profil berhasil diperbarui");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert("Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("Password minimal 8 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Password baru tidak cocok");
      return;
    }

    try {
      setSaving(true);

      // Update password via API
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengubah password");

      setPasswordSuccess("Password berhasil diubah!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);

      // Reload profile to check if must_change_password is cleared
      setTimeout(() => {
        loadProfile();
      }, 1000);
    } catch (error: any) {
      setPasswordError(error.message || "Gagal mengubah password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Profil tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-gray-600 mt-1">
          Kelola informasi profil dan password Anda
        </p>
      </div>

      {/* Profile Info Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <User className="text-green-600" size={32} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.full_name}</h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (editMode) {
                setFormData(profile);
                setEditMode(false);
              } else {
                setEditMode(true);
              }
            }}
            variant={editMode ? "outline" : "default"}
          >
            {editMode ? "Batal" : "Edit Profil"}
          </Button>
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Nama Lengkap *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="kelas">Kelas</Label>
                <select
                  id="kelas"
                  value={formData.kelas || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, kelas: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.name}>
                      {k.name}{" "}
                      {k.wali_kelas?.full_name
                        ? `- Wali Kelas: ${k.wali_kelas.full_name}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                <Input
                  id="tanggal_lahir"
                  type="date"
                  value={formData.tanggal_lahir || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal_lahir: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                <select
                  id="jenis_kelamin"
                  value={formData.jenis_kelamin || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, jenis_kelamin: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div>
                <Label htmlFor="no_telepon">No. Telepon</Label>
                <Input
                  id="no_telepon"
                  value={formData.no_telepon || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, no_telepon: e.target.value })
                  }
                  placeholder="08xxx"
                />
              </div>
              <div>
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  value={formData.alamat || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, alamat: e.target.value })
                  }
                  placeholder="Alamat lengkap"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-gray-500">Kelas</p>
                <p className="font-medium">
                  {profile.kelas || "-"}
                  {profile.kelas &&
                    kelasList.find((k) => k.name === profile.kelas)?.wali_kelas
                      ?.full_name && (
                      <span className="text-sm text-gray-500 ml-2">
                        (Wali Kelas:{" "}
                        {
                          kelasList.find((k) => k.name === profile.kelas)
                            ?.wali_kelas?.full_name
                        }
                        )
                      </span>
                    )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-gray-500">Tanggal Lahir</p>
                <p className="font-medium">{profile.tanggal_lahir || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-gray-500">Jenis Kelamin</p>
                <p className="font-medium">
                  {profile.jenis_kelamin === "L"
                    ? "Laki-laki"
                    : profile.jenis_kelamin === "P"
                    ? "Perempuan"
                    : "-"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-gray-500">No. Telepon</p>
                <p className="font-medium">{profile.no_telepon || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-gray-500">Alamat</p>
                <p className="font-medium">{profile.alamat || "-"}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Password Change Card */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="text-gray-600" size={24} />
          <div>
            <h2 className="text-lg font-semibold">Ubah Password</h2>
            <p className="text-sm text-gray-600">
              Ganti password untuk keamanan akun Anda
            </p>
          </div>
        </div>

        {!showPasswordForm ? (
          <Button onClick={() => setShowPasswordForm(true)} variant="outline">
            Ubah Password
          </Button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="new_password">Password Baru *</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">
                Konfirmasi Password Baru *
              </Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                required
              />
            </div>

            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600">{passwordSuccess}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? "Memproses..." : "Simpan Password Baru"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordForm(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
