import { AlertTriangle } from "lucide-react";

export type WatchItem = {
  kind: "am-overdue" | "team-missed";
  label: string;
  detail: string;
};

export function WatchList({ items }: { items: WatchItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl p-4" style={{ background: "#FFFBEB", border: "1.5px solid var(--color-pending)" }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(217,119,6,0.18)", color: "var(--color-pending)" }}>
          <AlertTriangle className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[10px] uppercase mb-1.5" style={{ color: "var(--color-pending)", letterSpacing: "0.14em" }}>
            Watch list · {items.length}
          </div>
          <ul className="flex flex-col gap-1.5">
            {items.map((it, i) => (
              <li key={i} className="font-bold text-[13px]" style={{ color: "var(--color-ink)", lineHeight: 1.4 }}>
                <b className="font-black">{it.label}</b>
                <span style={{ color: "var(--color-body)" }}> — {it.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
