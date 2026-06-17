"use client";

import { useEffect } from "react";

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
      same_day_conv: number;
      time: string;
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
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  const d = new Date(reportDate + "T00:00:00");
  const dateStr = `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const now = new Date();
  const exportedAt = `${now.getDate()} ${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()} · ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  // Group by PC for readable layout
  const byPc = new Map<string, { pc_name: string; pc_code: string; rows: AmRow[] }>();
  for (const r of rows) {
    const key = r.pc_code;
    if (!byPc.has(key)) byPc.set(key, { pc_name: r.pc_name, pc_code: r.pc_code, rows: [] });
    byPc.get(key)!.rows.push(r);
  }
  const groups = Array.from(byPc.values()).sort((a, b) => a.pc_name.localeCompare(b.pc_name));

  return (
    <>
      <style>{`
        @page { size: A4; margin: 18mm 14mm; }
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
          padding: 28px 24px;
          background: white;
        }
        .header-band {
          background: linear-gradient(135deg, #CE1126, #A30D1F);
          color: white;
          padding: 18px 22px;
          border-radius: 12px;
          margin-bottom: 22px;
        }
        .header-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.78); }
        .header-title  { font-size: 24px; font-weight: 900; letter-spacing: -0.025em; margin-top: 4px; }
        .header-sub    { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.86); margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead th {
          background: #F8FAFC;
          color: #64748B;
          font-weight: 800;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-align: left;
          padding: 10px 8px;
          border-bottom: 2px solid #0F172A;
        }
        thead th.num { text-align: right; }
        tbody td { padding: 9px 8px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
        tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 800; }
        tbody td.name { font-weight: 800; }
        tbody td.code { color: #94A3B8; font-weight: 700; font-size: 11px; }
        tbody td.pending { color: #B45309; font-weight: 700; font-style: italic; }
        tbody td.time { color: #64748B; font-weight: 600; font-size: 11px; }
        tfoot td {
          padding: 12px 8px;
          font-weight: 900;
          background: #F8FAFC;
          border-top: 2px solid #0F172A;
        }
        tfoot td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .pc-heading {
          margin: 20px 0 6px;
          font-size: 13px;
          font-weight: 900;
          color: #0F172A;
          letter-spacing: -0.01em;
        }
        .pc-heading .code-chip {
          margin-left: 8px;
          font-size: 10px;
          font-weight: 800;
          color: #64748B;
          background: #F1F5F9;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.08em;
        }
        .footer {
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1px solid #E2E8F0;
          font-size: 11px;
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
      <div className="print-root">
        <div className="header-band">
          <div className="header-eyebrow">LogIt · Daily Acquisition Report</div>
          <div className="header-title">Customer Acquisition</div>
          <div className="header-sub">{divisionName} · {dateStr}</div>
        </div>

        {groups.map((g) => {
          const filed = g.rows.filter((r) => r.filed);
          const pending = g.rows.filter((r) => !r.filed);
          const teamAcquired = filed.reduce((s, r) => s + (r as Extract<AmRow, { filed: true }>).acquired, 0);
          const teamOpened   = filed.reduce((s, r) => s + (r as Extract<AmRow, { filed: true }>).opened, 0);
          return (
            <div key={g.pc_code}>
              <div className="pc-heading">
                {g.pc_name}
                <span className="code-chip">PC {g.pc_code}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>AM</th>
                    <th>Code</th>
                    <th className="num">Acquired</th>
                    <th className="num">Opened</th>
                    <th className="num">Conv %</th>
                    <th>Filed at</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.am_code}>
                      <td className="name">{r.full_name}</td>
                      <td className="code">{r.am_code}</td>
                      {r.filed ? (
                        <>
                          <td className="num">{r.acquired}</td>
                          <td className="num">{r.opened}</td>
                          <td className="num">{r.acquired > 0 ? `${r.same_day_conv}%` : "—"}</td>
                          <td className="time">{r.time}</td>
                        </>
                      ) : (
                        <>
                          <td className="num pending" colSpan={3}>Pending</td>
                          <td className="time">—</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>{g.pc_name.toUpperCase()} TOTAL</td>
                    <td className="num">{teamAcquired}</td>
                    <td className="num">{teamOpened}</td>
                    <td className="num">{filed.length}/{g.rows.length}</td>
                    <td>{pending.length === 0 ? "all filed" : `${pending.length} pending`}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        <div className="pc-heading">Division total</div>
        <table>
          <tfoot>
            <tr>
              <td colSpan={2}>{divisionName.toUpperCase()}</td>
              <td className="num">{totals.acquired}</td>
              <td className="num">{totals.opened}</td>
              <td className="num">{filedCount}/{rows.length}</td>
              <td>{rows.length - filedCount} pending</td>
            </tr>
          </tfoot>
        </table>

        <div className="footer">
          <div>Exported by {adminName} · {exportedAt}</div>
          <div>Generated by LogIt — GTBank {divisionName}</div>
        </div>
      </div>

      <button onClick={() => window.print()} className="print-cta no-print">
        Print / Save as PDF
      </button>
    </>
  );
}
