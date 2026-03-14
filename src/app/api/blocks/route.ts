import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export async function POST(request: NextRequest) {
  const session = await getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = null
  }

  const blockedId =
    typeof (payload as { userId?: unknown })?.userId === "string"
      ? (payload as { userId: string }).userId.trim()
      : ""

  if (!blockedId || blockedId === session.user.id) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 })
  }

  await db.userBlock.upsert({
    where: {
      blockerId_blockedId: { blockerId: session.user.id, blockedId },
    },
    update: {},
    create: {
      blockerId: session.user.id,
      blockedId,
    },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = null
  }

  const blockedId =
    typeof (payload as { userId?: unknown })?.userId === "string"
      ? (payload as { userId: string }).userId.trim()
      : ""

  if (!blockedId) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 })
  }

  await db.userBlock.deleteMany({
    where: {
      blockerId: session.user.id,
      blockedId,
    },
  })

  return NextResponse.json({ success: true })
}
