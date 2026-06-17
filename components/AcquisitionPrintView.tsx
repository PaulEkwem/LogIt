"use client";

import { useEffect, useRef, useState } from "react";

export type AmRow =
  | { am_code: string; full_name: string; pc_name: string; pc_code: string; filed: false }
  | {
      am_code: string;
      full_name: string;
      pc_name: string;
      pc_code: string;
      filed: true;
      acquired: number;
      opened: number;
    };

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function AcquisitionPrintView({
  divisionName, reportDate, rows, totals, filedCount, adminName,
}: {
  divisionName: string;
  reportDate: string;
  rows: AmRow[];
  totals: { acquired: number; opened: number };
  filedCount: number;
  adminName: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (!rootRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const el = rootRef.current;
      // Continuous single page sized to the actual content height.
      const widthMm = 210; // A4 width
      const ratio = el.offsetHeight / el.offsetWidth;
      const heightMm = Math.max(297, Math.ceil(widthMm * ratio) + 4);
      // pagebreak is supported at runtime but isn't in the published typings.
      const opts = {
        margin: 0,
        filename: `acquisition-${reportDate}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: [widthMm, heightMm], orientation: "portrait" },
        pagebreak: { mode: ["avoid-all"] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      await html2pdf().from(el).set(opts).save();
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { void downloadPdf(); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = new Date(reportDate + "T00:00:00");
  const dateStr = `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const now = new Date();
  const exportedAt = `${now.getDate()} ${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()} · ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  // One unified, sorted table — by PC name, then AM code within each PC.
  const sorted = [...rows].sort((a, b) => {
    const byPc = a.pc_name.localeCompare(b.pc_name);
    return byPc !== 0 ? byPc : a.am_code.localeCompare(b.am_code);
  });

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        html, body { background: white; }
        .print-root {
          font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #0F172A;
          max-width: 900px;
          margin: 0 auto;
          padding: 18px 18px;
          background: white;
        }
        .header-band {
          background: linear-gradient(135deg, #CE1126, #A30D1F);
          color: white;
          padding: 14px 18px;
          border-radius: 10px;
          margin-bottom: 14px;
        }
        .header-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.78); }
        .header-title  { font-size: 20px; font-weight: 900; letter-spacing: -0.025em; margin-top: 3px; }
        .header-sub    { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.86); margin-top: 4px; }

        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        thead th {
          background: #F8FAFC;
          color: #64748B;
          font-weight: 800;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-align: left;
          padding: 7px 6px;
          border-bottom: 2px solid #0F172A;
        }
        thead th.num { text-align: right; }

        tbody td {
          padding: 4px 6px;
          border-bottom: 1px solid #E2E8F0;
          vertical-align: top;
          line-height: 1.25;
        }
        tbody tr.team-first td {
          border-top: 1.5px solid #94A3B8;
          padding-top: 6px;
        }
        tbody td.team-cell { font-weight: 900; color: #0F172A; }
        tbody td.pc-cell { font-weight: 800; color: #64748B; font-size: 10px; }
        tbody td.name { font-weight: 700; }
        tbody td.code { color: #94A3B8; font-weight: 700; font-size: 10px; }
        tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 800; }
        tbody td.pending { color: #B45309; font-weight: 700; font-style: italic; text-align: right; }

        tfoot td {
          padding: 9px 6px;
          font-weight: 900;
          background: #F8FAFC;
          border-top: 2px solid #0F172A;
        }
        tfoot td.num { text-align: right; font-variant-numeric: tabular-nums; }

        .footer {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid #E2E8F0;
          font-size: 10px;
          color: #64748B;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
        }
        .print-cta {
          position: fixed;
          bottom: 16px;
          right: 16px;
          padding: 12px 20px;
          background: #0F172A;
          color: white;
          font-weight: 800;
          font-size: 13px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }
      `}</style>
      <div className="print-root" ref={rootRef}>
        <div className="header-band">
          <div className="header-eyebrow">LogIt · Daily Acquisition Report</div>
          <div className="header-title">Customer Acquisition</div>
          <div className="header-sub">{divisionName} · {dateStr}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: "18%" }}>Team</th>
              <th style={{ width: "6%" }}>PC</th>
              <th style={{ width: "32%" }}>AM</th>
              <th style={{ width: "10%" }}>Code</th>
              <th className="num" style={{ width: "17%" }}>Acquired</th>
              <th className="num" style={{ width: "17%" }}>Opened</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const isFirstOfTeam = i === 0 || sorted[i - 1].pc_code !== r.pc_code;
              return (
                <tr key={r.am_code} className={isFirstOfTeam ? "team-first" : ""}>
                  <td className="team-cell">{isFirstOfTeam ? r.pc_name : ""}</td>
                  <td className="pc-cell">{isFirstOfTeam ? r.pc_code : ""}</td>
                  <td className="name">{r.full_name}</td>
                  <td className="code">{r.am_code}</td>
                  {r.filed ? (
                    <>
                      <td className="num">{r.acquired}</td>
                      <td className="num">{r.opened}</td>
                    </>
                  ) : (
                    <td className="pending" colSpan={2}>Pending</td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>{divisionName.toUpperCase()} · {filedCount}/{rows.length} AMs filed</td>
              <td className="num">{totals.acquired}</td>
              <td className="num">{totals.opened}</td>
            </tr>
          </tfoot>
        </table>

        <div className="footer">
          <div>Exported by {adminName} · {exportedAt}</div>
          <div>Generated by LogIt — GTBank {divisionName}</div>
        </div>
      </div>

      <button onClick={downloadPdf} disabled={downloading} className="print-cta no-print">
        {downloading ? "Generating PDF…" : "Download again"}
      </button>
    </>
  );
}
