"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { ReportItem, ResourceItem } from "./api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return globalSocket;
}

export function useRealtimeIncidents(initialIncidents: ReportItem[] = []) {
  const [incidents, setIncidents] = useState<ReportItem[]>(initialIncidents);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onReportCreated(report: ReportItem) {
      setIncidents((prev) => {
        // Prevent duplicate entries
        if (prev.some((item) => item.id === report.id)) return prev;
        return [report, ...prev];
      });
    }

    function onReportVerified(verifiedReports: ReportItem[]) {
      setIncidents((prev) => {
        const verifiedIds = new Set(verifiedReports.map((r) => r.id));
        return prev.map((item) => {
          if (verifiedIds.has(item.id)) {
            const updated = verifiedReports.find((r) => r.id === item.id);
            return updated || { ...item, status: "verified" };
          }
          return item;
        });
      });
    }

    function onAllocationConfirmed(data: { report: ReportItem; resource: ResourceItem }) {
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === data.report.id ? { ...item, status: data.report.status || "in_progress" } : item
        )
      );
    }

    function onIncidentResolved(data: { report: ReportItem }) {
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === data.report.id ? { ...item, status: "resolved" } : item
        )
      );
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("report_created", onReportCreated);
    socket.on("report_verified", onReportVerified);
    socket.on("allocation_confirmed", onAllocationConfirmed);
    socket.on("incident_resolved", onIncidentResolved);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("report_created", onReportCreated);
      socket.off("report_verified", onReportVerified);
      socket.off("allocation_confirmed", onAllocationConfirmed);
      socket.off("incident_resolved", onIncidentResolved);
    };
  }, []);

  return { incidents, setIncidents, isConnected };
}
