"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"

const SESSION_COOKIE = "auth_session"

function normalizeName(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length < 2) return "error:Name must be at least 2 characters."
  if (trimmed.length > 60) return "error:Name must be 60 characters or less."
  return trimmed
}

export async function updateProfile(formData: FormData) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) {
    redirect("/profile?error=auth")
  }

  const session = await db.authSession.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.authSession.delete({ where: { id: session.id } })
    }
    redirect("/profile?error=auth")
  }

  const nameInput = String(formData.get("name") ?? "")
  const normalized = normalizeName(nameInput)
  if (typeof normalized === "string" && normalized.startsWith("error:")) {
    redirect(`/profile?error=${encodeURIComponent(normalized.slice(6))}`)
  }

  await db.user.update({
    where: { id: session.userId },
    data: { name: normalized },
  })

  revalidatePath("/profile")
  redirect("/profile?updated=1")
}
