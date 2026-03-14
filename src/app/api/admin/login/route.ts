import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { createSessionToken, verifyPassword } from "@/lib/auth"

const SESSION_COOKIE = "auth_session"
const SESSION_TTL_DAYS = 7

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return null
}

function isAdminUser(user: {
  role: string | null
  isStaff: boolean
  isSuperuser: boolean
}) {
  return user.role === "ADMIN" || user.isStaff || user.isSuperuser
}

export async function POST(request: Request) {
  try {
    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      payload = null
    }

    const email =
      typeof (payload as { email?: unknown })?.email === "string"
        ? (payload as { email: string }).email.trim().toLowerCase()
        : ""
    const password =
      typeof (payload as { password?: unknown })?.password === "string"
        ? (payload as { password: string }).password
        : ""

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }
    if (!user.isActive) {
      return NextResponse.json({ error: "Your account is disabled." }, { status: 403 })
    }
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 })
    }

    const token = createSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent")

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      db.authSession.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      }),
    ])

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error("Admin login error:", error)
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : error instanceof Error
        ? error.message
        : "Unknown error."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
