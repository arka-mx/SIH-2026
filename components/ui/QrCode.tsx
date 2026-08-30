"use client";

import { useMemo } from "react";
import { QrCode as QrEncoder, type Ecc } from "@/lib/qrcode";

interface QrCodeProps {
  value: string;
  /** Rendered pixel size of one side. */
  size?: number;
  ecc?: Ecc;
  /** Quiet-zone width in modules (spec minimum is 4). */
  quietZone?: number;
  dark?: string;
  light?: string;
  className?: string;
}

export function QrCode({
  value,
  size = 240,
  ecc = "QUARTILE",
  quietZone = 4,
  dark = "#0f1b2d",
  light = "#ffffff",
  className,
}: QrCodeProps) {
  const { dim, path } = useMemo(() => {
    const qr = QrEncoder.encodeText(value || " ", ecc);
    let d = "";
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) d += `M${x + quietZone} ${y + quietZone}h1v1h-1z`;
      }
    }
    return { dim: qr.size + quietZone * 2, path: d };
  }, [value, ecc, quietZone]);

  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code"
      className={className}
    >
      <rect width={dim} height={dim} fill={light} />
      <path d={path} fill={dark} />
    </svg>
  );
}
