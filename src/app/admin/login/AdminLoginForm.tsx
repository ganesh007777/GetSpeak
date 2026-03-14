"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !password) {
      setError("Email and password are required.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || ""
        let message = `Sign in failed (HTTP ${response.status}).`

        if (contentType.includes("application/json")) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null
          if (data?.error) {
            message = data.error
          }
        } else {
          const text = await response.text().catch(() => "")
          if (text) {
            message = text.slice(0, 200)
          }
        }

        setError(message)
        return
      }

      router.push("/admin")
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Admin</Badge>
            <CardTitle>Sign in</CardTitle>
          </div>
          <CardDescription>
            Use an admin account to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
            <div className="text-xs text-muted-foreground">
              Need an admin account? Run
              <span className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                bun run admin:create -- you@example.com "Your Name" "StrongPassword123"
              </span>
              on the server.
            </div>
            <a className="text-xs text-muted-foreground underline" href="/">
              Back to Get Speak
            </a>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
