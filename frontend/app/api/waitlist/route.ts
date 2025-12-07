import { NextResponse } from "next/server";

const WEBHOOK_URL = process.env.WAITLIST_WEBHOOK_URL;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, source } = body || {};

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    // If webhook not set, accept but warn
    if (!WEBHOOK_URL) {
      console.warn("[WAITLIST] Received email but WAITLIST_WEBHOOK_URL not set:", email);
      return NextResponse.json({ ok: true });
    }

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: source || "brickstack-app",
        createdAt: new Date().toISOString()
      })
    });

    if (!res.ok) {
      console.error("[WAITLIST] Webhook responded non-200", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ ok: false, error: "Failed to store email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WAITLIST] Error:", err);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}

