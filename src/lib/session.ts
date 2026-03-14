import { NextRequest } from "next/server"

import { db } from "@/lib/db"

const SESSION_COOKIE = "auth_session"

export async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.authSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date() || session.logoutAt) {
    if (session) {
      await db.authSession.delete({ where: { id: session.id } })
    }
    return null
  }

  if (!session.user.isActive) {
    await db.authSession.update({
      where: { id: session.id },
      data: { logoutAt: new Date(), expiresAt: new Date() },
    })
    return null
  }

  return session
}
