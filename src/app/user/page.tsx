import Link from "next/link"
import { cookies } from "next/headers"

import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const dynamic = "force-dynamic"

const SESSION_COOKIE = "auth_session"

function formatDate(value?: Date | null) {
  if (!value) return "--"
  return value.toLocaleString()
}

function formatShortDate(value?: Date | null) {
  if (!value) return "--"
  return value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "U"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function daysSince(value: Date) {
  const diff = Date.now() - value.getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

function maskId(value: string) {
  if (value.length <= 8) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function SignedOutState() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
        <Card className="w-full border-muted/60 shadow-sm">
          <CardHeader>
            <Badge variant="secondary">Guest</Badge>
            <CardTitle className="text-2xl">User Dashboard</CardTitle>
            <CardDescription>
              Sign in to see your profile, posts, and recent activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Your session is missing or expired. Head back to the home page to log in.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/">Back to Home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Open Chat</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default async function UserDashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) {
    return <SignedOutState />
  }

  const session = await db.authSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.authSession.delete({ where: { id: session.id } })
    }
    return <SignedOutState />
  }

  const user = session.user
  const displayName = user.name ?? user.email
  const initials = getInitials(displayName)

  const [
    totalPosts,
    publishedPosts,
    recentPosts,
    recentSessions,
    activeAuthSessions,
  ] = await Promise.all([
    db.post.count({ where: { authorId: user.id } }),
    db.post.count({ where: { authorId: user.id, published: true } }),
    db.post.findMany({ where: { authorId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.userSession.findMany({ where: { userId: user.id }, orderBy: { loginAt: "desc" }, take: 5 }),
    db.authSession.count({
      where: { userId: user.id, expiresAt: { gt: new Date() }, logoutAt: null },
    }),
  ])

  const profileScore = Math.min(
    100,
    40 +
      (user.name ? 20 : 0) +
      (totalPosts > 0 ? 20 : 0) +
      (recentSessions.length > 0 ? 20 : 0)
  )

  const memberDays = daysSince(user.createdAt)
  const lastLogin = recentSessions[0]?.loginAt ?? null

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-6 rounded-2xl border border-muted/40 bg-background/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-400 text-lg font-semibold text-white shadow-sm">
                {initials}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge>USER</Badge>
                  <Badge variant="outline">{memberDays} days</Badge>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {displayName}</h1>
                <p className="text-sm text-muted-foreground">
                  Here&apos;s what&apos;s happening with your account right now.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
              <Button asChild>
                <Link href="/">Open Chat</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile Strength</span>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Completeness</span>
                <span>{profileScore}%</span>
              </div>
              <Progress value={profileScore} />
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last chat login</span>
                <span className="font-medium">{formatDate(lastLogin)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active web sessions</span>
                <span className="font-medium">{activeAuthSessions}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Posts</CardTitle>
              <CardDescription>Everything you created</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{totalPosts}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Published</CardTitle>
              <CardDescription>Visible to everyone</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{publishedPosts}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Chat Sessions</CardTitle>
              <CardDescription>Recent logins</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{recentSessions.length}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Account Age</CardTitle>
              <CardDescription>Days since you joined</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{memberDays}</CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{user.name ?? "No name set"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{maskId(user.id)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">{formatShortDate(user.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Latest 5 posts you created</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPosts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                          No posts yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPosts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">{post.title}</TableCell>
                          <TableCell>
                            <Badge variant={post.published ? "default" : "secondary"}>
                              {post.published ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatShortDate(post.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Chat Logins</CardTitle>
              <CardDescription>Last 5 sessions tied to your account</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chat sessions yet.</p>
              ) : (
                recentSessions.map((sessionEntry) => (
                  <div key={sessionEntry.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium">{sessionEntry.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {sessionEntry.ipAddress ?? "--"} • {formatDate(sessionEntry.loginAt)}
                      </span>
                    </div>
                    <Badge variant={sessionEntry.logoutAt ? "outline" : "default"}>
                      {sessionEntry.logoutAt ? "Logged out" : "Active"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Session health and security notes</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active auth sessions</span>
                <span className="font-medium">{activeAuthSessions}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current session expires</span>
                <span className="font-medium">{formatDate(session.expiresAt)}</span>
              </div>
              <Separator />
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">
                  If you don&apos;t recognize a session, log out from the home page to invalidate it.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
