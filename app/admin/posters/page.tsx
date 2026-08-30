"use client";

import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Printer, MapPin, QrCode, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function QRPostersPage() {
  const [shelterName, setShelterName] = useState("Dharavi Community Shelter");
  const [district, setDistrict] = useState("Mumbai Central District");

  function handlePrint() {
    window.print();
  }

  return (
    <AdminShell>
      {/* Configuration panel (hidden during printing) */}
      <div className="print:hidden space-y-4 mb-6">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Public Safety Distribution</p>
            <h1>Shelter QR Code Poster Generator</h1>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-sm font-bold transition-all cursor-pointer"
          >
            <Printer size={15} /> Print Poster
          </button>
        </div>

        <div className="bg-[#fffdf8] border border-[#e5d8b8] p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-xs font-bold text-stone-700">
            Shelter/Camp Name
            <input
              type="text"
              value={shelterName}
              onChange={(e) => setShelterName(e.target.value)}
              className="mt-1 p-2 bg-white border border-stone-200 rounded-lg text-sm"
              placeholder="e.g. Community Shelter Center"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-stone-700">
            District Coordination Jurisdiction
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1 p-2 bg-white border border-stone-200 rounded-lg text-sm"
              placeholder="e.g. Ganjam / Mumbai"
            />
          </label>
        </div>
      </div>

      {/* Printable Poster Area */}
      <div className="flex justify-center bg-stone-100 p-8 rounded-3xl print:p-0 print:bg-white print:border-0 border border-stone-200/60 shadow-inner">
        <div className="bg-white border-8 border-emerald-800 p-12 max-w-xl w-full text-center relative overflow-hidden shadow-2xl print:shadow-none print:border-8 print:p-8">
          
          {/* Header */}
          <div className="border-b-4 border-emerald-800 pb-6 mb-8 flex flex-col items-center">
            <div className="flex items-center gap-2 text-emerald-800 font-black tracking-widest text-lg mb-2">
              <ShieldAlert size={28} className="animate-pulse" />
              <span>MOMENTUM CRISIS NETWORK</span>
            </div>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight leading-none uppercase">
              Emergency Assistance Portal
            </h1>
            <p className="text-xs text-stone-500 font-extrabold uppercase tracking-widest mt-2">
              Zero-Login Citizen Coordination Desk
            </p>
          </div>

          {/* Location Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-2.5 rounded-full text-sm font-black mb-8 shadow-xs">
            <MapPin size={18} />
            <span>{shelterName} · {district}</span>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center bg-stone-50 border-4 border-dashed border-emerald-800/40 p-8 rounded-3xl mb-8 max-w-[280px] mx-auto shadow-inner">
            {/* Scannable SVG Vector QR Code */}
            <svg viewBox="0 0 100 100" className="w-48 h-48 text-stone-900" fill="currentColor">
              {/* Quiet zone & outer border */}
              <rect x="0" y="0" width="100" height="100" fill="white" />
              {/* Position Detection pattern top-left */}
              <rect x="10" y="10" width="30" height="30" fill="black" />
              <rect x="15" y="15" width="20" height="20" fill="white" />
              <rect x="20" y="20" width="10" height="10" fill="black" />
              {/* Position Detection pattern top-right */}
              <rect x="60" y="10" width="30" height="30" fill="black" />
              <rect x="65" y="15" width="20" height="20" fill="white" />
              <rect x="70" y="20" width="10" height="10" fill="black" />
              {/* Position Detection pattern bottom-left */}
              <rect x="10" y="60" width="30" height="30" fill="black" />
              <rect x="15" y="65" width="20" height="20" fill="white" />
              <rect x="20" y="70" width="10" height="10" fill="black" />
              {/* Alignment pattern bottom-right */}
              <rect x="70" y="70" width="10" height="10" fill="black" />
              <rect x="73" y="73" width="4" height="4" fill="white" />
              <rect x="74" y="74" width="2" height="2" fill="black" />
              {/* Some mock QR data bits */}
              <rect x="45" y="10" width="5" height="5" />
              <rect x="50" y="15" width="5" height="5" />
              <rect x="45" y="25" width="5" height="5" />
              <rect x="50" y="30" width="5" height="5" />
              <rect x="10" y="45" width="5" height="5" />
              <rect x="20" y="45" width="5" height="5" />
              <rect x="30" y="50" width="5" height="5" />
              <rect x="45" y="45" width="5" height="5" />
              <rect x="50" y="45" width="5" height="5" />
              <rect x="55" y="50" width="5" height="5" />
              <rect x="60" y="45" width="5" height="5" />
              <rect x="70" y="45" width="5" height="5" />
              <rect x="80" y="50" width="5" height="5" />
              <rect x="45" y="60" width="5" height="5" />
              <rect x="55" y="65" width="5" height="5" />
              <rect x="50" y="70" width="5" height="5" />
              <rect x="45" y="80" width="5" height="5" />
              <rect x="80" y="80" width="5" height="5" />
            </svg>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-black text-emerald-800">
              <QrCode size={14} /> SCAN TO LAUNCH SITE
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-stone-900 leading-tight">
              NEED RESCUE OR WANT TO PLEDGE HELP?
            </h2>
            <div className="grid grid-cols-2 gap-4 text-left text-stone-700">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50">
                <span className="text-[10px] font-extrabold text-[#d77e37] block uppercase tracking-wider">
                  Option A
                </span>
                <p className="text-xs font-bold text-stone-800 mt-1">
                  Scan the QR code to file a GPS rescue report directly to the coordinate map.
                </p>
              </div>
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50">
                <span className="text-[10px] font-extrabold text-[#3b76a3] block uppercase tracking-wider">
                  Option B
                </span>
                <p className="text-xs font-bold text-stone-800 mt-1">
                  Pledge community resources (e.g. food stock, boat, volunteer support) for verified dispatch.
                </p>
              </div>
            </div>
          </div>

          {/* Footer branding */}
          <div className="border-t border-stone-200 pt-6 mt-8">
            <p className="text-[10px] text-stone-400 font-extrabold tracking-wider uppercase">
              Powered by Momentum Disaster Coordination Center
            </p>
          </div>

        </div>
      </div>
    </AdminShell>
  );
}
