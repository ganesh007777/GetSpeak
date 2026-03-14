import { cookies } from "next/headers"

import { db } from "@/lib/db"

const SESSION_COOKIE = "auth_session"

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.authSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date() || session.logoutAt) return null
  if (!session.user.isActive) return null

  const isAdmin =
    session.user.role === "ADMIN" || session.user.isStaff || session.user.isSuperuser

  return isAdmin ? session : null
}
