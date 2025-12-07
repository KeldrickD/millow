"use client";

import { useState } from "react";

export default function WaitlistBanner() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source: "explore-waitlist"
        })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Unable to join waitlist");
      }

      setStatus("success");
      setMessage("You’re in. We’ll email you when real deals go live.");
      setEmail("");
    } catch (err: any) {
      console.error("[WAITLIST] submit error:", err);
      setStatus("error");
      setMessage("Something went wrong. Please try again in a minute or DM us your email.");
    }
  }

  return (
    <div className="w-full rounded-3xl border border-mirage/5 bg-mirage/5 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-mirage">Get early access to tokenized deals</p>
        <p className="text-[11px] text-mirage/60">
          Join the BrickStack alpha list. We’ll only email you when we have real properties ready to back.
        </p>
        {message && (
          <p className={`mt-1 text-[11px] ${status === "success" ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex w-full md:w-auto items-center gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full md:w-56 rounded-full border border-mirage/10 bg-white px-3 py-1.5 text-xs text-mirage placeholder:text-mirage/40 focus:outline-none focus:ring-2 focus:ring-blaze/70"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-blaze px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {status === "loading" ? "Joining…" : "Join waitlist"}
        </button>
      </form>
    </div>
  );
}

