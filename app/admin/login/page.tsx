"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/public/BackButton";
import { useLanguage } from "@/lib/language";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [username, setUsername] = useState(process.env.NEXT_PUBLIC_DEFAULT_ADMIN_USERNAME || "admin");
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD || "admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("error", "Invalid credentials"));
      }

      router.push(data.redirect || "/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || t("error", "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="public-home theme-light">
      <BackButton />
      <section className="access-form-layout">
        <form className="access-form" onSubmit={handleSubmit}>
          <div className="form-icon">
            <ShieldCheck size={24} />
          </div>
          <h2>{t("title", "Admin sign in")}</h2>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 border border-red-200 flex items-center gap-2 mb-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <label htmlFor="admin-username">
            {t("username", "Username")}
            <input
              id="admin-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              className="mt-1"
            />
          </label>

          <label htmlFor="admin-password">
            {t("password", "Password")}
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </label>

          <button className="form-submit" type="submit" disabled={loading}>
            {loading ? t("loading", "Signing in…") : t("submit", "Sign in")} <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}