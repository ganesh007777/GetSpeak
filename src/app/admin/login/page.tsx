import { redirect } from "next/navigation"

import { getAdminSession } from "@/lib/admin-auth"

import AdminLoginForm from "./AdminLoginForm"

export const dynamic = "force-dynamic"

export default async function AdminLoginPage() {
  const adminSession = await getAdminSession()
  if (adminSession) {
    redirect("/admin")
  }

  return <AdminLoginForm />
}
