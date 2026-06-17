"use client";

import { useEffect } from "react";

type Row =
  | { pc_name: string; pc_code: string; filed: false }
  | {
      pc_name: string;
      pc_code: string;
      filed: true;
      pledges: number;
      inflow: number;
      outflow: number;
      net: number;
      filled_by: string;
      time: string;
    };

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs < 1) return abs.toFixed(2);
  if (abs < 10) return abs.toFixed(1);
  return abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function netColor(n: number): string {
  if (n < 0) return "#B91C1C";
  if (n < 100) return "#92400E";
  return "#166534";
}

export function RetentionPrintView({
  slot, divisionName, reportDate, rows, totals, filedCount, adminName,
}: {
  slot: "midday" | "eod";
  divisionName: string;
  reportDate: string;
  rows: Row[];
  totals: { pledges: number; inflow: number; outflow: number; net: number };
  filedCount: number;
  adminName: string;
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  const d = new Date(reportDate + "T00:00:00");
  const dateStr = `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const slotLabel = slot === "midday" ? "Midday Snapshot · 12:00" : "End of Day · 17:00";
  const now = new Date();
  const exportedAt = `${now.getDate()} ${MONTHS[now.getMonth()].slice(0,3)} ${now.getFullYear()} · ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

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
        tbody td { padding: 6px 6px; border-bottom: 1px solid #E2E8F0; vertical-align: middle; line-height: 1.25; }
        tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 800; }
        tbody td.team { font-weight: 900; }
        tbody td.pc-code { color: #64748B; font-weight: 800; font-size: 10px; }
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
      <div className="print-root">
        <div className="header-band">
          <div className="header-eyebrow">LogIt · Daily Retention Report</div>
          <div className="header-title">{slotLabel}</div>
          <div className="header-sub">{divisionName} · {dateStr}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>PC</th>
              <th className="num">Pledges (₦M)</th>
              <th className="num">Inflow (₦M)</th>
              <th className="num">Outflow (₦M)</th>
              <th className="num">Net (₦M)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pc_code}>
                <td className="team">{r.pc_name}</td>
                <td className="pc-code">{r.pc_code}</td>
                {r.filed ? (
                  <>
                    <td className="num">{fmtMoney(r.pledges)}</td>
                    <td className="num" style={{ color: "#166534" }}>{fmtMoney(r.inflow)}</td>
                    <td className="num" style={{ color: "#B91C1C" }}>{fmtMoney(r.outflow)}</td>
                    <td className="num" style={{ color: netColor(r.net) }}>
                      {r.net < 0 ? "−" : "+"}{fmtMoney(r.net)}
                    </td>
                  </>
                ) : (
                  <td className="num pending" colSpan={4}>Pending</td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>DIVISION TOTAL · {filedCount}/{rows.length} teams filed</td>
              <td className="num">{fmtMoney(totals.pledges)}</td>
              <td className="num" style={{ color: "#166534" }}>{fmtMoney(totals.inflow)}</td>
              <td className="num" style={{ color: "#B91C1C" }}>{fmtMoney(totals.outflow)}</td>
              <td className="num" style={{ color: netColor(totals.net) }}>
                {totals.net < 0 ? "−" : "+"}{fmtMoney(totals.net)}
              </td>
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
