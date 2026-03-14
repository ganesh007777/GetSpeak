import { NextRequest, NextResponse } from "next/server"

import { getSessionUser } from "@/lib/session"

export async function GET(request: NextRequest) {
  const session = await getSessionUser(request)
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role,
      isStaff: session.user.isStaff,
      isSuperuser: session.user.isSuperuser,
    },
  })
}
