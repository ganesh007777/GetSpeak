"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"

export async function updateUser(formData: FormData) {
  const adminSession = await getAdminSession()
  if (!adminSession) return

  const id = String(formData.get("id") ?? "").trim()
  const emailValue = String(formData.get("email") ?? "").trim().toLowerCase()
  const usernameValue = String(formData.get("username") ?? "").trim()
  const nameValue = String(formData.get("name") ?? "").trim()
  const firstNameValue = String(formData.get("firstName") ?? "").trim()
  const lastNameValue = String(formData.get("lastName") ?? "").trim()
  const roleValue = String(formData.get("role") ?? "").trim()
  const isActive = formData.get("isActive") === "on"
  const isStaff = formData.get("isStaff") === "on"
  const isSuperuser = formData.get("isSuperuser") === "on"

  if (!id) return
  if (!emailValue) return

  const role = roleValue === "ADMIN" ? "ADMIN" : "USER"
  const name = nameValue.length > 0 ? nameValue : null
  const username = usernameValue.length > 0 ? usernameValue : null
  const firstName = firstNameValue.length > 0 ? firstNameValue : null
  const lastName = lastNameValue.length > 0 ? lastNameValue : null

  await db.user.update({
    where: { id },
    data: {
      email: emailValue,
      username,
      name,
      firstName,
      lastName,
      role,
      isActive,
      isStaff,
      isSuperuser,
    },
  })

  if (!isActive) {
    await db.authSession.updateMany({
      where: { userId: id, logoutAt: null },
      data: { logoutAt: new Date(), expiresAt: new Date() },
    })
  }

  revalidatePath("/admin")
}
