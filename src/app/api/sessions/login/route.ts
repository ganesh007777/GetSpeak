import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"

function getClientIp() {
  const hdrs = headers()
  const forwardedFor = hdrs.get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = hdrs.get("x-real-ip")
  if (realIp) return realIp
  return null
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = null
  }

  const username =
    typeof (payload as { username?: unknown })?.username === "string"
      ? (payload as { username: string }).username.trim()
      : ""
  const userId =
    typeof (payload as { userId?: unknown })?.userId === "string"
      ? (payload as { userId: string }).userId.trim()
      : null

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 })
  }

  const ipAddress = getClientIp()
  const userAgent = headers().get("user-agent")

  if (userId) {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User is not active." }, { status: 403 })
    }
  }

  const session = await db.userSession.create({
    data: {
      username,
      userId: userId || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  })

  return NextResponse.json({ sessionId: session.id })
}
