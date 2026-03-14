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

  const reportedId =
    typeof (payload as { reportedId?: unknown })?.reportedId === "string"
      ? (payload as { reportedId: string }).reportedId.trim()
      : ""
  const messageId =
    typeof (payload as { messageId?: unknown })?.messageId === "string"
      ? (payload as { messageId: string }).messageId.trim()
      : null
  const reason =
    typeof (payload as { reason?: unknown })?.reason === "string"
      ? (payload as { reason: string }).reason.trim()
      : ""
  const details =
    typeof (payload as { details?: unknown })?.details === "string"
      ? (payload as { details: string }).details.trim()
      : null

  if (!reportedId || !reason) {
    return NextResponse.json({ error: "Reported user and reason are required." }, { status: 400 })
  }
  if (reportedId === session.user.id) {
    return NextResponse.json({ error: "Cannot report yourself." }, { status: 400 })
  }

  const report = await db.userReport.create({
    data: {
      reporterId: session.user.id,
      reportedId,
      messageId: messageId || null,
      reason,
      details: details || null,
    },
  })

  return NextResponse.json({ reportId: report.id })
}
