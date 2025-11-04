"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // Get the code from URL
      const code = searchParams.get("code")

      if (code) {
        try {
          // Exchange code for session
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) throw error

          // Get user and redirect based on role
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

            if (profile?.role === "guru") {
              router.push("/guru/dashboard")
            } else if (profile?.role === "admin") {
              router.push("/admin/dashboard")
            } else {
              router.push("/siswa/dashboard")
            }
          }
        } catch (error) {
          console.error("Auth callback error:", error)
          router.push("/auth/error?error=callback_failed")
        }
      } else {
        router.push("/auth/error?error=no_code")
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Memproses konfirmasi email...</p>
      </div>
    </div>
  )
}
