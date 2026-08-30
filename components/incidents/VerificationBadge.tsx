"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Users,
  GitCompareArrows,
  Camera,
  MapPin,
  Clock,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { VerificationResult, VerificationTier } from "@/lib/reportVerification";

/** One muted accent colour per tier — no fills, no emoji. */
const TIER_COLOR: Record<VerificationTier, string> = {
  unverified: "var(--a-amber, #b45309)",
  reported: "var(--a-ink-mute, #64748b)",
  high_confidence: "var(--a-accent, #c2410c)",
  verified: "var(--a-red, #b91c1c)",
};

const FACTOR_ICON: Record<string, LucideIcon> = {
  clustering: Users,
  cross_verification: GitCompareArrows,
  evidence: Camera,
  location_consistency: MapPin,
  recency: Clock,
  reporter_reliability: UserCheck,
};

export function VerificationBadge({
  verification,
  size = "sm",
}: {
  verification?: VerificationResult | null;
  size?: "sm" | "xs";
}) {
  if (!verification) return null;
  const color = TIER_COLOR[verification.tier];
  const xs = size === "xs";
  return (
    <span
      title={verification.summary}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: xs ? 5 : 6,
        border: "1px solid var(--a-border-strong, #c8d1dc)",
        background: "var(--a-surface, #fff)",
        color: "var(--a-ink, #0f1b2d)",
        padding: xs ? "2px 6px" : "3px 8px",
        fontSize: xs ? 9.5 : 10,
        fontWeight: 800,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{ width: 7, height: 7, flexShrink: 0, background: color }}
      />
      {verification.tierLabel}
      <span
        style={{
          color: "var(--a-ink-mute, #64748b)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0,
        }}
      >
        {verification.score}
      </span>
    </span>
  );
}

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <span
      style={{
        display: "block",
        height: 4,
        background: "var(--a-surface-alt, #f7f9fb)",
        border: "1px solid var(--a-hairline, #dde3ea)",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: color,
        }}
      />
    </span>
  );
}

export function VerificationPanel({
  verification,
  onConfirm,
  busy,
}: {
  verification?: VerificationResult | null;
  onConfirm?: (
    role: "responder" | "authority" | "admin",
    manual?: boolean
  ) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!verification) return null;
  const color = TIER_COLOR[verification.tier];

  return (
    <div
      className="mt-2"
      style={{
        border: "1px solid var(--a-border-strong, #c8d1dc)",
        background: "var(--a-surface, #fff)",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="w-full flex items-center justify-between gap-2"
        style={{ padding: "9px 12px" }}
      >
        <span
          className="flex items-center gap-1.5"
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--a-ink-mute, #64748b)",
          }}
        >
          <ShieldCheck size={13} /> Report confidence
        </span>
        <span className="flex items-center gap-2">
          <VerificationBadge verification={verification} />
          {open ? (
            <ChevronUp size={13} className="text-slate-400" />
          ) : (
            <ChevronDown size={13} className="text-slate-400" />
          )}
        </span>
      </button>

      {open && (
        <div
          style={{ borderTop: "1px solid var(--a-hairline, #dde3ea)", padding: 12 }}
          className="space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Verdict + overall score */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "var(--a-ink-soft, #475569)",
                }}
              >
                {verification.summary}
              </p>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  color,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {verification.score}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--a-ink-mute, #64748b)",
                  }}
                >
                  /100
                </span>
              </span>
            </div>
            <div className="mt-2">
              <Meter pct={verification.score} color={color} />
            </div>
          </div>

          {/* Factor breakdown */}
          <ul className="space-y-2.5">
            {verification.factors.map((f) => {
              const Icon = FACTOR_ICON[f.key] ?? ShieldCheck;
              const full = f.points >= f.max;
              return (
                <li key={f.key} className="flex items-start gap-2.5">
                  <Icon
                    size={13}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--a-ink-mute, #64748b)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "var(--a-ink, #0f1b2d)",
                        }}
                      >
                        {f.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: full
                            ? "var(--a-green, #15803d)"
                            : "var(--a-ink-mute, #64748b)",
                        }}
                      >
                        {f.points}
                        <span style={{ color: "var(--a-ink-mute, #64748b)", fontWeight: 400 }}>
                          {" / "}
                          {f.max}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1">
                      <Meter
                        pct={(f.points / f.max) * 100}
                        color={
                          full
                            ? "var(--a-green, #15803d)"
                            : "var(--a-border-strong, #c8d1dc)"
                        }
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 10.5,
                        lineHeight: 1.45,
                        marginTop: 3,
                        color: "var(--a-ink-mute, #64748b)",
                      }}
                    >
                      {f.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              color: "var(--a-ink-mute, #64748b)",
              paddingTop: 8,
              borderTop: "1px solid var(--a-hairline, #dde3ea)",
            }}
          >
            {verification.cluster.uniqueDevices} independent device
            {verification.cluster.uniqueDevices === 1 ? "" : "s"} ·{" "}
            {verification.cluster.nearbyReports} report
            {verification.cluster.nearbyReports === 1 ? "" : "s"} within{" "}
            {verification.cluster.radiusKm * 1000} m /{" "}
            {verification.cluster.windowMinutes} min
          </p>

          {onConfirm && (
            <div
              className="flex flex-wrap gap-1.5"
              style={{ paddingTop: 10, borderTop: "1px solid var(--a-hairline, #dde3ea)" }}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm("responder")}
                className="adm-btn"
              >
                Responder confirm
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm("authority")}
                className="adm-btn"
              >
                Authority confirm
              </button>
              <button
                type="button"
                disabled={busy || verification.tier === "verified"}
                onClick={() => onConfirm("admin", true)}
                className="adm-btn adm-btn--primary"
              >
                Vouch — mark verified
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
