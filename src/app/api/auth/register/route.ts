import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { createSessionToken, hashPassword } from "@/lib/auth"

const SESSION_COOKIE = "auth_session"
const SESSION_TTL_DAYS = 7

export async function POST(request: Request) {
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
  const username =
    typeof (payload as { username?: unknown })?.username === "string"
      ? (payload as { username: string }).username.trim()
      : ""
  const name =
    typeof (payload as { name?: unknown })?.name === "string"
      ? (payload as { name: string }).name.trim()
      : ""
  const firstName =
    typeof (payload as { firstName?: unknown })?.firstName === "string"
      ? (payload as { firstName: string }).firstName.trim()
      : ""
  const lastName =
    typeof (payload as { lastName?: unknown })?.lastName === "string"
      ? (payload as { lastName: string }).lastName.trim()
      : ""

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 })
  }
  if (username) {
    const existingUsername = await db.user.findUnique({ where: { username } })
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 })
    }
  }

  const passwordHash = hashPassword(password)
  const user = await db.user.create({
    data: {
      email,
      username: username || null,
      passwordHash,
      name: name || null,
      firstName: firstName || null,
      lastName: lastName || null,
      role: "USER",
    },
  })

  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db.authSession.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  })

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, username: user.username },
  })

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  })

  return response
}
