import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface User {
  id: string
  username: string
}

interface Message {
  id: string
  username: string
  content: string
  timestamp: Date
  type: 'user' | 'system'
}

const users = new Map<string, User>()

const generateMessageId = () => Math.random().toString(36).substr(2, 9)

const createSystemMessage = (content: string): Message => ({
  id: generateMessageId(),
  username: 'System',
  content,
  timestamp: new Date(),
  type: 'system'
})

const createUserMessage = (username: string, content: string): Message => ({
  id: generateMessageId(),
  username,
  content,
  timestamp: new Date(),
  type: 'user'
})

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)

  const removeUser = () => {
    const user = users.get(socket.id)
    if (!user) return
    users.delete(socket.id)
    const leaveMessage = createSystemMessage(`${user.username} left the chat room`)
    io.emit('user-left', { user: { id: socket.id, username: user.username }, message: leaveMessage })
    console.log(`${user.username} left the chat room, current online users: ${users.size}`)
  }

  // Add test event handler
  socket.on('test', (data) => {
    console.log('Received test message:', data)
    socket.emit('test-response', { 
      message: 'Server received test message', 
      data: data,
      timestamp: new Date().toISOString()
    })
  })

  socket.on('join', (data: { username: string }) => {
    const { username } = data
    
    // Create user object
    const user: User = {
      id: socket.id,
      username
    }
    
    // Add to user list
    users.set(socket.id, user)
    
    // Send join message to all users
    const joinMessage = createSystemMessage(`${username} joined the chat room`)
    io.emit('user-joined', { user, message: joinMessage })
    
    // Send current user list to new user
    const usersList = Array.from(users.values())
    socket.emit('users-list', { users: usersList })
    
    console.log(`${username} joined the chat room, current online users: ${users.size}`)
  })

  socket.on('message', (data: { content: string; username: string }) => {
    const { content, username } = data
    const user = users.get(socket.id)
    
    if (user && user.username === username) {
      const message = createUserMessage(username, content)
      io.emit('message', message)
      console.log(`${username}: ${content}`)
    }
  })

  socket.on('disconnect', () => {
    if (users.has(socket.id)) {
      removeUser()
      return
    }
    console.log(`User disconnected: ${socket.id}`)
  })

  socket.on('logout', () => {
    removeUser()
  })

  socket.on('join-room', (data: { roomId: string }) => {
    const roomId = data?.roomId
    if (!roomId) return

    socket.join(roomId)
    const room = io.sockets.adapter.rooms.get(roomId)
    const peers = room ? Array.from(room).filter((id) => id !== socket.id) : []
    socket.emit('room-peers', { peers })
    socket.to(roomId).emit('peer-joined', { peerId: socket.id })
  })

  socket.on('leave-room', (data: { roomId: string }) => {
    const roomId = data?.roomId
    if (!roomId) return
    socket.leave(roomId)
    socket.to(roomId).emit('peer-left', { peerId: socket.id })
  })

  socket.on('webrtc-offer', (data: { to: string; offer: any }) => {
    if (!data?.to || !data?.offer) return
    io.to(data.to).emit('webrtc-offer', { from: socket.id, offer: data.offer })
  })

  socket.on('webrtc-answer', (data: { to: string; answer: any }) => {
    if (!data?.to || !data?.answer) return
    io.to(data.to).emit('webrtc-answer', { from: socket.id, answer: data.answer })
  })

  socket.on('webrtc-ice-candidate', (data: { to: string; candidate: any }) => {
    if (!data?.to || !data?.candidate) return
    io.to(data.to).emit('webrtc-ice-candidate', { from: socket.id, candidate: data.candidate })
  })

  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomId) => {
      if (roomId === socket.id) return
      socket.to(roomId).emit('peer-left', { peerId: socket.id })
    })
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = Number(process.env.PORT ?? 3003)
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})
