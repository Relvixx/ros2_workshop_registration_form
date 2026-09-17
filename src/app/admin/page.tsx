import { cookies } from "next/headers";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminLogin } from "@/components/AdminLogin";
import { ADMIN_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organizer Dashboard | ROS2 Workshop" };

export default async function AdminPage() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  let authed = false;
  if (token && process.env.ADMIN_SESSION_SECRET) {
    try {
      const { verifyAdminSession } = await import("@/lib/auth");
      authed = await verifyAdminSession(token);
    } catch {
      authed = false;
    }
  }
  return authed ? <AdminDashboard /> : <AdminLogin />;
}
