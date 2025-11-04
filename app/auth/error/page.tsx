"use client";

import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    callback_failed: "Gagal memproses konfirmasi email. Silakan coba lagi.",
    no_code: "Kode konfirmasi tidak ditemukan. Silakan coba daftar ulang.",
    invalid_credentials: "Email atau password salah.",
    user_not_found: "Pengguna tidak ditemukan.",
    email_not_confirmed: "Email belum dikonfirmasi. Periksa email Anda.",
  };

  const message =
    errorMessages[error || ""] || "Terjadi kesalahan. Silakan coba lagi.";

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-red-50 to-white">
      <div className="w-full max-w-sm">
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <CardTitle className="text-2xl">Terjadi Kesalahan</CardTitle>
                <CardDescription>
                  Gagal memproses permintaan Anda
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">{message}</p>
            <div className="flex gap-3">
              <Link href="/auth/login" className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Kembali ke Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
