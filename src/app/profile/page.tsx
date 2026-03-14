import Link from "next/link"
import { cookies } from "next/headers"

import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

import { updateProfile } from "./actions"

export const dynamic = "force-dynamic"

const SESSION_COOKIE = "auth_session"

function formatDate(value?: Date | null) {
  if (!value) return "--"
  return value.toLocaleString()
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "U"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function SignedOutState() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,theme(colors.amber.50),theme(colors.white),theme(colors.emerald.50))] dark:bg-[radial-gradient(circle_at_top,theme(colors.slate.950),theme(colors.slate.950),theme(colors.slate.900))]">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
        <Card className="w-full border-muted/60 shadow-sm">
          <CardHeader>
            <Badge variant="secondary">Guest</Badge>
            <CardTitle className="text-2xl">Profile</CardTitle>
            <CardDescription>
              Sign in to view and update your profile details.
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

function getParamValue(value?: string | string[]) {
  if (!value) return ""
  return Array.isArray(value) ? value[0] ?? "" : value
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { updated?: string | string[]; error?: string | string[] }
}) {
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

  const updatedParam = getParamValue(searchParams?.updated)
  const errorParam = getParamValue(searchParams?.error)
  const errorMessage =
    errorParam === "auth" ? "Please sign in again." : errorParam ? decodeURIComponent(errorParam) : ""

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,theme(colors.amber.50),theme(colors.white),theme(colors.emerald.50))] dark:bg-[radial-gradient(circle_at_top,theme(colors.slate.950),theme(colors.slate.950),theme(colors.slate.900))]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 rounded-2xl border border-muted/40 bg-background/85 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-400 text-xl font-semibold text-white shadow-sm">
                {initials}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge>USER</Badge>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">Your Profile</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your personal details and session info.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link href="/user">Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>
          {updatedParam === "1" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
              Profile updated successfully.
            </div>
          )}
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {errorMessage}
            </div>
          )}
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Update your display name</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form action={updateProfile} className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" name="name" defaultValue={user.name ?? ""} placeholder="Your name" />
                  <p className="text-xs text-muted-foreground">
                    This name shows up when you chat and on your dashboard.
                  </p>
                </div>
                <Button type="submit">Save Profile</Button>
              </form>
              <Separator />
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-xs">{user.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
              <CardDescription>Account activity at a glance</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Member since</span>
                <span className="font-medium">{formatDate(user.createdAt)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span className="font-medium">{formatDate(user.updatedAt)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current session expires</span>
                <span className="font-medium">{formatDate(session.expiresAt)}</span>
              </div>
              <Separator />
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                For security, log out from the home page if you no longer need this session.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
