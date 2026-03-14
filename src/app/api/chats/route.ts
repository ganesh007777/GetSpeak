import { NextRequest, NextResponse } from "next/server"
import { ChatRole, ChatType } from "@prisma/client"

import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

function serializeChat(chat: any) {
  return {
    id: chat.id,
    type: chat.type,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    participants: (chat.participants || []).map((participant: any) => ({
      id: participant.user.id,
      username: participant.user.username,
      name: participant.user.name,
      role: participant.role,
    })),
    lastMessage: chat.messages?.[0]
      ? {
          id: chat.messages[0].id,
          content: chat.messages[0].content,
          createdAt: chat.messages[0].createdAt,
          senderId: chat.messages[0].senderId,
          type: chat.messages[0].type,
        }
      : null,
  }
}

async function ensureGlobalChat(userId: string) {
  let globalChat = await db.chat.findFirst({ where: { type: "GLOBAL" } })
  if (!globalChat) {
    globalChat = await db.chat.create({
      data: {
        type: "GLOBAL",
        title: "Global Chat",
      },
    })
  }

  const existingParticipant = await db.chatParticipant.findUnique({
    where: {
      chatId_userId: {
        chatId: globalChat.id,
        userId,
      },
    },
  })

  if (!existingParticipant) {
    await db.chatParticipant.create({
      data: {
        chatId: globalChat.id,
        userId,
        role: "MEMBER",
      },
    })
  }

  return globalChat
}

export async function GET(request: NextRequest) {
  const session = await getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureGlobalChat(session.user.id)

  const chats = await db.chat.findMany({
    where: {
      participants: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return NextResponse.json({
    chats: chats.map((chat) => serializeChat(chat)),
  })
}

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

  const type =
    typeof (payload as { type?: unknown })?.type === "string"
      ? ((payload as { type: string }).type.toUpperCase() as ChatType)
      : null
  const title =
    typeof (payload as { title?: unknown })?.title === "string"
      ? (payload as { title: string }).title.trim()
      : ""
  const participantIds =
    Array.isArray((payload as { participantIds?: unknown })?.participantIds)
      ? (payload as { participantIds: unknown[] }).participantIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0
        )
      : []
  const otherUserId =
    typeof (payload as { otherUserId?: unknown })?.otherUserId === "string"
      ? (payload as { otherUserId: string }).otherUserId.trim()
      : ""

  if (!type || !Object.values(ChatType).includes(type)) {
    return NextResponse.json({ error: "Invalid chat type." }, { status: 400 })
  }
  if (type === "GLOBAL") {
    return NextResponse.json({ error: "Global chat is system-managed." }, { status: 400 })
  }

  if (type === "DIRECT") {
    const targetId = otherUserId || participantIds[0]
    if (!targetId) {
      return NextResponse.json({ error: "Direct chat requires a user." }, { status: 400 })
    }
    if (targetId === session.user.id) {
      return NextResponse.json({ error: "Cannot start a direct chat with yourself." }, { status: 400 })
    }

    const targetUser = await db.user.findUnique({ where: { id: targetId } })
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

    const block = await db.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: session.user.id, blockedId: targetId },
          { blockerId: targetId, blockedId: session.user.id },
        ],
      },
    })
    if (block) {
      return NextResponse.json({ error: "Chat is blocked between these users." }, { status: 403 })
    }

    const [a, b] = [session.user.id, targetId].sort()
    const directKey = `${a}:${b}`
    const existing = await db.chat.findUnique({
      where: { directKey },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, name: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (existing) {
      return NextResponse.json({ chat: serializeChat(existing) })
    }

    const chat = await db.chat.create({
      data: {
        type: "DIRECT",
        directKey,
        createdById: session.user.id,
        participants: {
          create: [
            { userId: session.user.id, role: ChatRole.MEMBER },
            { userId: targetId, role: ChatRole.MEMBER },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, name: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    return NextResponse.json({ chat: serializeChat(chat) })
  }

  if (participantIds.length === 0) {
    return NextResponse.json({ error: "Group chat requires participants." }, { status: 400 })
  }

  const uniqueParticipants = Array.from(
    new Set([session.user.id, ...participantIds.filter((id) => id !== session.user.id)])
  )
  const existingUsers = await db.user.findMany({
    where: { id: { in: uniqueParticipants } },
    select: { id: true },
  })
  const existingIds = new Set(existingUsers.map((user) => user.id))
  const validParticipants = uniqueParticipants.filter((id) => existingIds.has(id))

  if (validParticipants.length === 1) {
    return NextResponse.json({ error: "No valid participants found." }, { status: 400 })
  }

  const chat = await db.chat.create({
    data: {
      type: "GROUP",
      title: title || "New Group",
      createdById: session.user.id,
      participants: {
        create: validParticipants.map((userId) => ({
          userId,
          role: userId === session.user.id ? ChatRole.OWNER : ChatRole.MEMBER,
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, username: true, name: true },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  })

  return NextResponse.json({ chat: serializeChat(chat) })
}
