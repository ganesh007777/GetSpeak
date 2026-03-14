import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"

const SESSION_COOKIE = "auth_session"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (token) {
    await db.authSession.updateMany({
      where: { token, logoutAt: null },
      data: { logoutAt: new Date(), expiresAt: new Date() },
    })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })

  return response
}
