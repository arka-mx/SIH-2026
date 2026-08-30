"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { BellRing, X, Radio, Loader2 } from "lucide-react";
import {
  apiGetEmergencyAlerts,
  apiMarkEmergencyAlertRead,
  apiRegisterAlertRecipient,
  type EmergencyAlertItem,
  type AlertAudience,
} from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device";

/**
 * Emergency Alert System — in-app notification surface.
 *
 * A shell-agnostic floating widget mounted once in the root layout. It infers
 * the audience from the current route (/admin → authorities, /rescuer →
 * responders, everything else → citizens), polls `GET /api/alerts`, and shows
 * the same emergency broadcasts that went out over SMS. Citizens can opt in to
 * SMS by registering their number here.
 */

const POLL_MS = 20_000;

function audienceForPath(pathname: string): AlertAudience {
  if (pathname.startsWith("/admin")) return "authorities";
  if (pathname.startsWith("/rescuer")) return "responders";
  return "citizens";
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#b91c1c",
  high: "#c2410c",
  moderate: "#a16207",
  low: "#0f766e",
};

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function EmergencyAlertsWidget() {
  const pathname = usePathname() || "/";
  const audience = useMemo(() => audienceForPath(pathname), [pathname]);

  const [alerts, setAlerts] = useState<EmergencyAlertItem[]>([]);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [regState, setRegState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const readerKey = useMemo(
    () => (audience === "citizens" ? getOrCreateDeviceId() : audience),
    [audience]
  );

  useEffect(() => {
    let alive = true;
    const run = () => {
      apiGetEmergencyAlerts({ audience, limit: 30 }).then((list) => {
        if (alive) setAlerts(list);
      });
    };
    run();
    const id = setInterval(run, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [audience]);

  const unread = alerts.filter((a) => !a.read_by.includes(readerKey)).length;

  async function markRead(alert: EmergencyAlertItem) {
    if (alert.read_by.includes(readerKey)) return;
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, read_by: [...a.read_by, readerKey] } : a))
    );
    await apiMarkEmergencyAlertRead(alert.id, readerKey);
  }

  async function markAllRead() {
    await Promise.all(alerts.filter((a) => !a.read_by.includes(readerKey)).map(markRead));
  }

  async function registerPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setRegState("saving");
    const ok = await apiRegisterAlertRecipient({
      phone: phone.trim(),
      audience: "citizens",
      deviceId: getOrCreateDeviceId(),
    });
    setRegState(ok ? "done" : "error");
    if (ok) setPhone("");
  }

  return (
    <div style={styles.root}>
      {open && (
        <div style={styles.panel} role="dialog" aria-label="Emergency alerts">
          <div style={styles.panelHead}>
            <span style={styles.panelTitle}>
              <Radio size={14} /> Emergency Alerts
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {unread > 0 && (
                <button style={styles.linkBtn} onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              <button style={styles.iconBtn} onClick={() => setOpen(false)} aria-label="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          <div style={styles.list}>
            {alerts.length === 0 && <div style={styles.empty}>No emergency alerts right now.</div>}
            {alerts.map((a) => {
              const isRead = a.read_by.includes(readerKey);
              return (
                <button
                  key={a.id}
                  style={{ ...styles.item, ...(isRead ? {} : styles.itemUnread) }}
                  onClick={() => markRead(a)}
                >
                  <div style={styles.itemTop}>
                    <span
                      style={{
                        ...styles.sevDot,
                        background: SEVERITY_COLOR[a.severity] || "#c2410c",
                      }}
                    />
                    <span style={styles.itemHeadline}>{a.headline}</span>
                    <span style={styles.itemTime}>{timeAgo(a.created_at)}</span>
                  </div>
                  <p style={styles.itemBody}>{a.body}</p>
                  <div style={styles.itemMeta}>
                    {a.sms.configured
                      ? `SMS: ${a.sms.sent} sent${a.sms.failed ? `, ${a.sms.failed} failed` : ""}`
                      : `SMS: ${a.sms.simulated} simulated (provider not configured)`}
                  </div>
                </button>
              );
            })}
          </div>

          {audience === "citizens" && (
            <form style={styles.regRow} onSubmit={registerPhone}>
              <p style={styles.regHint}>
                Get critical alerts by SMS — delivered on cellular signal alone, no internet needed.
              </p>
              <input
                style={styles.input}
                type="tel"
                inputMode="tel"
                placeholder="Phone for SMS alerts"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button style={styles.regBtn} type="submit" disabled={regState === "saving"}>
                {regState === "saving" ? <Loader2 size={13} className="animate-spin" /> : "Notify me"}
              </button>
              {regState === "done" && <span style={styles.regOk}>✓ Registered</span>}
              {regState === "error" && <span style={styles.regErr}>Try again</span>}
            </form>
          )}
        </div>
      )}

      <button
        style={{ ...styles.fab, ...(unread > 0 ? styles.fabAlert : {}) }}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Emergency alerts${unread ? `, ${unread} unread` : ""}`}
      >
        <BellRing size={18} />
        {unread > 0 && <span style={styles.badge}>{unread > 9 ? "9+" : unread}</span>}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: "fixed", right: 16, bottom: 16, zIndex: 2147483000, fontFamily: "system-ui, sans-serif" },
  fab: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 9999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#1c1917",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
  },
  fabAlert: { background: "#b91c1c", animation: "none" },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    padding: "0 4px",
    borderRadius: 9999,
    background: "#f59e0b",
    color: "#1c1917",
    fontSize: 11,
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
  },
  panel: {
    position: "absolute",
    right: 0,
    bottom: 60,
    width: "min(360px, calc(100vw - 32px))",
    maxHeight: "min(70vh, 560px)",
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    color: "#1c1917",
    border: "1px solid rgba(0,0,0,0.14)",
    borderRadius: 12,
    boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
    overflow: "hidden",
  },
  panelHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    background: "#fafaf9",
  },
  panelTitle: { display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 },
  list: { overflowY: "auto", flex: 1 },
  empty: { padding: 20, fontSize: 13, color: "#78716c", textAlign: "center" },
  item: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    background: "transparent",
    border: "none",
    borderLeft: "3px solid transparent",
    cursor: "pointer",
  },
  itemUnread: { background: "#fef2f2", borderLeft: "3px solid #b91c1c" },
  itemTop: { display: "flex", alignItems: "center", gap: 6 },
  sevDot: { width: 8, height: 8, borderRadius: 9999, flexShrink: 0 },
  itemHeadline: { fontWeight: 700, fontSize: 12.5, flex: 1, lineHeight: 1.3 },
  itemTime: { fontSize: 11, color: "#a8a29e", flexShrink: 0 },
  itemBody: { margin: "4px 0 0", fontSize: 12, lineHeight: 1.4, color: "#44403c" },
  itemMeta: { marginTop: 4, fontSize: 10.5, color: "#a8a29e", textTransform: "uppercase", letterSpacing: 0.3 },
  regRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    padding: "8px 12px",
    borderTop: "1px solid rgba(0,0,0,0.08)",
    background: "#fafaf9",
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: 120,
    padding: "6px 8px",
    fontSize: 12,
    border: "1px solid rgba(0,0,0,0.18)",
    borderRadius: 6,
  },
  regBtn: {
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    background: "#1c1917",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  regHint: { flexBasis: "100%", margin: "0 0 2px", fontSize: 11, lineHeight: 1.35, color: "#78716c" },
  regOk: { fontSize: 11, color: "#15803d", fontWeight: 700 },
  regErr: { fontSize: 11, color: "#b91c1c", fontWeight: 700 },
  linkBtn: { background: "none", border: "none", color: "#0369a1", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#57534e", display: "grid", placeItems: "center" },
};
