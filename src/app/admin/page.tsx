import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

function formatDate(value: Date | null | undefined) {
  if (!value) return "—"
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
  const [
    users,
    posts,
    totalUsers,
    totalPosts,
    publishedPosts,
    adminCount,
  ] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.post.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.user.count(),
    db.post.count(),
    db.post.count({ where: { published: true } }),
    db.user.count({ where: { role: "ADMIN" } }),
  ])

  const usersById = new Map(users.map((user) => [user.id, user]))
  const admins = users.filter((user) => user.role === "ADMIN")
  const recentUsers = users.slice(0, 5)
  const recentPosts = posts.slice(0, 5)

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
          Users, posts, and system status for this site.
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
            <CardTitle>Admins</CardTitle>
            <CardDescription>Users with admin role</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{adminCount}</CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Who joined and connected recently</CardDescription>
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
                        {user.name ?? "No name"} • {formatDate(user.createdAt)}
                      </span>
                    </div>
                    <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                      {user.role ?? "USER"}
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
                          {author?.email ?? post.authorId} • {formatDate(post.createdAt)}
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
            <CardTitle>Users</CardTitle>
            <CardDescription>Full user list (latest 50)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No users yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                            {user.role ?? "USER"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
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
              bun run admin:create -- you@example.com "Your Name"
            </div>
            <p className="text-xs text-muted-foreground">
              Use the command above to add or promote an admin.
            </p>
          </CardContent>
        </Card>

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
                      {admin.name ?? "No name"} • {formatDate(admin.createdAt)}
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
