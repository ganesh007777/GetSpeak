import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = null
  }

  const sessionId =
    typeof (payload as { sessionId?: unknown })?.sessionId === "string"
      ? (payload as { sessionId: string }).sessionId.trim()
      : ""

  if (!sessionId) {
    return NextResponse.json({ error: "Session id is required." }, { status: 400 })
  }

  await db.userSession.updateMany({
    where: { id: sessionId, logoutAt: null },
    data: { logoutAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
