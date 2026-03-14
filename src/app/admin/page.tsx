import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { updateUser } from "./actions"

export const dynamic = "force-dynamic"

function formatDate(value: Date | null | undefined) {
  if (!value) return "--"
  return value.toLocaleString()
}

function maskDbUrl(url: string) {
  if (!url) return "Not set"
  if (url.startsWith("file:")) {
    const filePath = url.replace("file:", "")
    const parts = filePath.split(/[\\/]/)
    const file = parts[parts.length - 1] || filePath
    return `file:./${file}`
  }
  return url.replace(/\/\/.*@/, "//***@")
}

export default async function AdminPage() {
  const adminSession = await getAdminSession()
  if (!adminSession) {
    redirect("/admin/login")
  }

  let users: any[] = []
  let posts: any[] = []
  let chatSessions: any[] = []
  let authSessions: any[] = []
  let totalUsers = 0
  let activeUsers = 0
  let blockedUsers = 0
  let staffCount = 0
  let superuserCount = 0
  let totalPosts = 0
  let publishedPosts = 0
  let totalChatSessions = 0
  let activeChatSessions = 0
  let totalAuthSessions = 0
  let activeAuthSessions = 0

  try {
    const result = await Promise.all([
      db.user.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      db.post.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      db.userSession.findMany({ orderBy: { loginAt: "desc" }, take: 50 }),
      db.authSession.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: true },
      }),
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.user.count({ where: { isActive: false } }),
      db.user.count({ where: { isStaff: true } }),
      db.user.count({ where: { isSuperuser: true } }),
      db.post.count(),
      db.post.count({ where: { published: true } }),
      db.userSession.count(),
      db.userSession.count({ where: { logoutAt: null } }),
      db.authSession.count(),
      db.authSession.count({
        where: { logoutAt: null, expiresAt: { gt: new Date() } },
      }),
    ])

    users = result[0]
    posts = result[1]
    chatSessions = result[2]
    authSessions = result[3]
    totalUsers = result[4]
    activeUsers = result[5]
    blockedUsers = result[6]
    staffCount = result[7]
    superuserCount = result[8]
    totalPosts = result[9]
    publishedPosts = result[10]
    totalChatSessions = result[11]
    activeChatSessions = result[12]
    totalAuthSessions = result[13]
    activeAuthSessions = result[14]
  } catch (error) {
    console.error("Database error:", error)
  }

  const usersById = new Map(users.map((user) => [user.id, user]))
  const admins = users.filter(
    (user) => user.role === "ADMIN" || user.isStaff || user.isSuperuser
  )
  const recentUsers = users.slice(0, 5)
  const recentPosts = posts.slice(0, 5)
  const recentChatSessions = chatSessions.slice(0, 5)
  const recentAuthSessions = authSessions.slice(0, 5)

  const databaseUrl = maskDbUrl(process.env.DATABASE_URL ?? "")
  const nodeEnv = process.env.NODE_ENV ?? "development"

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Admin</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Users, sessions, and system status for this site.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>Registered accounts</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalUsers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
            <CardDescription>Allowed to log in</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{activeUsers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Blocked Users</CardTitle>
            <CardDescription>Login disabled</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{blockedUsers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Staff + Superusers</CardTitle>
            <CardDescription>Elevated accounts</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {staffCount + superuserCount}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Posts</CardTitle>
            <CardDescription>All posts created</CardDescription>
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
            <CardDescription>Total logins</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalChatSessions}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Chats</CardTitle>
            <CardDescription>Currently connected</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{activeChatSessions}</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Auth Sessions</CardTitle>
            <CardDescription>Total logins</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalAuthSessions}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Auth</CardTitle>
            <CardDescription>Still valid</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{activeAuthSessions}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Staff Users</CardTitle>
            <CardDescription>Staff role</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{staffCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Superusers</CardTitle>
            <CardDescription>Full access</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{superuserCount}</CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Newest accounts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium">{user.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.name ?? "No name"} - {formatDate(user.createdAt)}
                      </span>
                    </div>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Blocked"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Latest content created</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentPosts.map((post) => {
                  const author = usersById.get(post.authorId)
                  return (
                    <div key={post.id} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{post.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {author?.email ?? post.authorId} - {formatDate(post.createdAt)}
                        </span>
                      </div>
                      <Badge variant={post.published ? "default" : "secondary"}>
                        {post.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Chat Logins</CardTitle>
            <CardDescription>Chat username and IP</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentChatSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentChatSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium">{session.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {session.ipAddress ?? "--"} - {formatDate(session.loginAt)}
                      </span>
                    </div>
                    <Badge variant={session.logoutAt ? "outline" : "default"}>
                      {session.logoutAt ? "Logged out" : "Active"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Auth Logins</CardTitle>
            <CardDescription>Email, IP, and logout status</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentAuthSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No auth sessions yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentAuthSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {session.user?.email ?? session.userId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session.ipAddress ?? "--"} - {formatDate(session.createdAt)}
                      </span>
                    </div>
                    <Badge variant={session.logoutAt ? "outline" : "default"}>
                      {session.logoutAt ? "Logged out" : "Active"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chat Session Details</CardTitle>
            <CardDescription>Latest 50 chat records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Logout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chatSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No sessions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    chatSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.username}</TableCell>
                        <TableCell className="font-mono text-xs">{session.userId ?? "--"}</TableCell>
                        <TableCell>{session.ipAddress ?? "--"}</TableCell>
                        <TableCell>{formatDate(session.loginAt)}</TableCell>
                        <TableCell>{formatDate(session.logoutAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auth Session Details</CardTitle>
            <CardDescription>Latest 50 login records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Logout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No sessions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    authSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.user?.email ?? session.userId}
                        </TableCell>
                        <TableCell>{session.ipAddress ?? "--"}</TableCell>
                        <TableCell>{formatDate(session.createdAt)}</TableCell>
                        <TableCell>{formatDate(session.logoutAt)}</TableCell>
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Full user list (latest 50)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Save</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                        No users yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const formId = `user-${user.id}`
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="align-top">
                            <form id={formId} action={updateUser} />
                            <input type="hidden" name="id" value={user.id} form={formId} />
                            <input
                              name="email"
                              defaultValue={user.email}
                              className="h-8 w-48 rounded-md border px-2 text-sm"
                              placeholder="Email"
                              form={formId}
                            />
                            <div className="mt-2 text-xs text-muted-foreground">
                              {user.id}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <input
                              name="username"
                              defaultValue={user.username ?? ""}
                              className="h-8 w-32 rounded-md border px-2 text-sm"
                              placeholder="Username"
                              form={formId}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-2">
                              <input
                                name="firstName"
                                defaultValue={user.firstName ?? ""}
                                className="h-8 w-32 rounded-md border px-2 text-sm"
                                placeholder="First name"
                                form={formId}
                              />
                              <input
                                name="lastName"
                                defaultValue={user.lastName ?? ""}
                                className="h-8 w-32 rounded-md border px-2 text-sm"
                                placeholder="Last name"
                                form={formId}
                              />
                              <input
                                name="name"
                                defaultValue={user.name ?? ""}
                                className="h-8 w-32 rounded-md border px-2 text-sm"
                                placeholder="Display name"
                                form={formId}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <select
                              name="role"
                              defaultValue={user.role ?? "USER"}
                              className="h-8 w-28 rounded-md border px-2 text-sm"
                              form={formId}
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-2 text-xs">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  name="isActive"
                                  defaultChecked={user.isActive}
                                  form={formId}
                                />
                                Active
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  name="isStaff"
                                  defaultChecked={user.isStaff}
                                  form={formId}
                                />
                                Staff
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  name="isSuperuser"
                                  defaultChecked={user.isSuperuser}
                                  form={formId}
                                />
                                Superuser
                              </label>
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-xs text-muted-foreground">
                            <div>Joined: {formatDate(user.createdAt)}</div>
                            <div>Last login: {formatDate(user.lastLoginAt)}</div>
                          </TableCell>
                          <TableCell className="align-top">
                            <button
                              type="submit"
                              form={formId}
                              className="h-8 rounded-md border px-3 text-xs font-semibold"
                            >
                              Save
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })
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
            <CardTitle>Posts</CardTitle>
            <CardDescription>Full post list (latest 50)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No posts yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((post) => {
                      const author = usersById.get(post.authorId)
                      return (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">{post.title}</TableCell>
                          <TableCell>
                            <Badge variant={post.published ? "default" : "secondary"}>
                              {post.published ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>{author?.email ?? post.authorId}</TableCell>
                          <TableCell>{formatDate(post.createdAt)}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>System and database connection</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-medium">{nodeEnv}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium">SQLite (Prisma)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">DATABASE_URL</span>
              <span className="font-medium">{databaseUrl}</span>
            </div>
            <Separator />
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs">
              bun run admin:create -- you@example.com "Your Name" "StrongPassword123"
            </div>
            <p className="text-xs text-muted-foreground">
              Use the command above to add or promote an admin.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
            <CardDescription>Who can manage the website</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No admins yet. Create one with the command in Settings.
              </p>
            ) : (
              admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{admin.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {admin.name ?? "No name"} - {formatDate(admin.createdAt)}
                    </span>
                  </div>
                  <Badge>ADMIN</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
