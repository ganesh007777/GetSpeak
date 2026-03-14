import { createServer } from "http"
import { Server } from "socket.io"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PORT = Number(process.env.PORT ?? process.env.SOCKET_PORT ?? 3003)
const APP_ORIGIN =
  process.env.APP_ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"

type OnlineUser = {
  id: string
  username: string
  name?: string | null
}

const socketUsers = new Map<string, OnlineUser>()

function parseCookies(rawCookie?: string) {
  if (!rawCookie) return {}
  return rawCookie.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=")
    if (!key) return acc
    acc[key] = decodeURIComponent(rest.join("="))
    return acc
  }, {})
}

function buildOnlineUsers() {
  const unique = new Map<string, OnlineUser>()
  socketUsers.forEach((user) => {
    if (!unique.has(user.id)) {
      unique.set(user.id, user)
    }
  })
  return Array.from(unique.values())
}

async function getSessionUserFromSocket(socket: any) {
  const cookies = parseCookies(socket.handshake.headers?.cookie)
  const token = cookies["auth_session"]
  if (!token) return null

  const session = await prisma.authSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date() || session.logoutAt) {
    return null
  }
  if (!session.user.isActive) {
    return null
  }

  return session.user
}

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: APP_ORIGIN,
    credentials: true,
  },
})

io.use(async (socket, next) => {
  try {
    const user = await getSessionUserFromSocket(socket)
    if (!user) return next(new Error("Unauthorized"))
    socket.data.user = {
      id: user.id,
      username: user.username || user.email,
      name: user.name,
    }
    next()
  } catch (error) {
    next(new Error("Unauthorized"))
  }
})

io.on("connection", (socket) => {
  const user: OnlineUser = socket.data.user

  socket.on("join", ({ username }: { username?: string }) => {
    const alreadyOnline = Array.from(socketUsers.values()).some(
      (existing) => existing.id === user.id
    )
    const displayName = typeof username === "string" && username.trim().length > 0
      ? username.trim()
      : user.username
    socketUsers.set(socket.id, {
      id: user.id,
      username: displayName,
      name: user.name,
    })

    const online = buildOnlineUsers()
    io.emit("users-list", { users: online })
    if (!alreadyOnline) {
      io.emit("user-joined", {
        user: { ...user, username: displayName },
        message: { content: `${displayName} joined the chat.` },
      })
    }
  })

  socket.on("logout", () => {
    socket.disconnect(true)
  })

  socket.on("disconnecting", () => {
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("peer-left", { peerId: socket.id })
      }
    })
  })

  socket.on("disconnect", () => {
    const existing = socketUsers.get(socket.id)
    if (existing) {
      socketUsers.delete(socket.id)
      const online = buildOnlineUsers()
      io.emit("users-list", { users: online })
      const stillOnline = online.some((user) => user.id === existing.id)
      if (!stillOnline) {
        io.emit("user-left", {
          user: existing,
          message: { content: `${existing.username} left the chat.` },
        })
      }
    }
  })

  socket.on("join-chat", async ({ chatId }: { chatId?: string }) => {
    if (!chatId) return
    const member = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: { chatId, userId: user.id },
      },
    })
    if (!member) return
    socket.join(chatId)
  })

  socket.on("leave-chat", async ({ chatId }: { chatId?: string }) => {
    if (!chatId) return
    socket.leave(chatId)
  })

  socket.on(
    "chat-message",
    async ({ chatId, content }: { chatId?: string; content?: string }) => {
      if (!chatId || typeof content !== "string" || content.trim().length === 0) return

      const member = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: { chatId, userId: user.id },
        },
        include: {
          chat: { select: { type: true } },
        },
      })
      if (!member) return

      socket.join(chatId)

      if (member.chat.type === "DIRECT") {
        const participants = await prisma.chatParticipant.findMany({
          where: { chatId },
          select: { userId: true },
        })
        const other = participants.find((p) => p.userId !== user.id)
        if (other) {
          const block = await prisma.userBlock.findFirst({
            where: {
              OR: [
                { blockerId: user.id, blockedId: other.userId },
                { blockerId: other.userId, blockedId: user.id },
              ],
            },
          })
          if (block) return
        }
      }

      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: user.id,
          content: content.trim(),
        },
      })

      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      })

      io.to(chatId).emit("chat-message", {
        chatId,
        message: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          type: message.type,
          sender: {
            id: user.id,
            username: user.username,
            name: user.name,
          },
        },
      })
    }
  )

  socket.on("join-room", ({ roomId }: { roomId?: string }) => {
    if (!roomId) return
    socket.join(roomId)
    const peers = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(
      (id) => id !== socket.id
    )
    socket.emit("room-peers", { peers })
    socket.to(roomId).emit("peer-joined", { peerId: socket.id })
  })

  socket.on("leave-room", ({ roomId }: { roomId?: string }) => {
    if (!roomId) return
    socket.leave(roomId)
    socket.to(roomId).emit("peer-left", { peerId: socket.id })
  })

  socket.on("webrtc-offer", ({ to, offer }: { to?: string; offer?: any }) => {
    if (!to || !offer) return
    socket.to(to).emit("webrtc-offer", { from: socket.id, offer })
  })

  socket.on("webrtc-answer", ({ to, answer }: { to?: string; answer?: any }) => {
    if (!to || !answer) return
    socket.to(to).emit("webrtc-answer", { from: socket.id, answer })
  })

  socket.on(
    "webrtc-ice-candidate",
    ({ to, candidate }: { to?: string; candidate?: any }) => {
      if (!to || !candidate) return
      socket.to(to).emit("webrtc-ice-candidate", { from: socket.id, candidate })
    }
  )
})

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`)
  console.log(`Allowed origin: ${APP_ORIGIN}`)
})
