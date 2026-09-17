import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSession, verifyAdminSession } from "@/lib/auth";

export async function isAdminRequest(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  if (!token) return false;
  try {
    return await verifyAdminSession(decodeURIComponent(token));
  } catch {
    return false;
  }
}

export const adminDenied = () =>
  NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });

/** POST /api/admin/login — password check + signed HttpOnly session cookie. */
export async function loginRoute(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const provided = body.password ?? "";
  if (!expected) {
    return NextResponse.json({ ok: false, code: "admin_not_configured" }, { status: 503 });
  }
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match) {
    // Genuine 401 on wrong password (throttle-friendly shape).
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: false, code: "wrong_password", message: "Incorrect password." }, { status: 401 });
  }
  let session: string;
  try {
    session = await createAdminSession();
  } catch {
    return NextResponse.json({ ok: false, code: "admin_not_configured" }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true, code: "ok" });
  res.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return res;
}

/** POST /api/admin/logout */
export async function logoutRoute() {
  const res = NextResponse.json({ ok: true, code: "ok" });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
