import { NextRequest, NextResponse } from "next/server"
import { MessageType } from "@prisma/client"

import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

function parseLimit(value: string | null, fallback = 50) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, 100)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const chatId = params.chatId
  const isParticipant = await db.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId, userId: session.user.id },
    },
  })
  if (!isParticipant) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get("limit"))
  const cursor = searchParams.get("cursor")

  let beforeDate: Date | null = null
  if (cursor) {
    const cursorMessage = await db.message.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    })
    beforeDate = cursorMessage?.createdAt ?? null
  }

  const messages = await db.message.findMany({
    where: {
      chatId,
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: { id: true, username: true, name: true },
      },
    },
  })

  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      chatId: message.chatId,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
      sender: message.sender
        ? {
            id: message.sender.id,
            username: message.sender.username,
            name: message.sender.name,
          }
        : null,
    })),
    nextCursor: messages.length > 0 ? messages[messages.length - 1]?.id : null,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const chatId = params.chatId
  const isParticipant = await db.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId, userId: session.user.id },
    },
  })
  if (!isParticipant) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = null
  }

  const content =
    typeof (payload as { content?: unknown })?.content === "string"
      ? (payload as { content: string }).content.trim()
      : ""

  if (!content) {
    return NextResponse.json({ error: "Message content is required." }, { status: 400 })
  }

  const message = await db.message.create({
    data: {
      chatId,
      senderId: session.user.id,
      content,
      type: MessageType.TEXT,
    },
    include: {
      sender: {
        select: { id: true, username: true, name: true },
      },
    },
  })

  await db.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({
    message: {
      id: message.id,
      chatId: message.chatId,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
      sender: message.sender
        ? {
            id: message.sender.id,
            username: message.sender.username,
            name: message.sender.name,
          }
        : null,
    },
  })
}
