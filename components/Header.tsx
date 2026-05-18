import { Flame, Zap } from "lucide-react";

export function Header({ who, streak, xp }: { who: string; streak: number; xp: number }) {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between"
      style={{
        background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))",
        padding: "14px 20px 18px",
      }}
    >
      <div>
        <div className="font-black text-[22px] text-white" style={{ letterSpacing: "-0.035em" }}>
          Log<span style={{ color: "var(--color-brand-gold)" }}>It</span>
        </div>
        <div
          className="font-bold text-[11px] uppercase mt-[3px]"
          style={{ color: "rgba(255,255,255,0.72)", letterSpacing: "0.04em" }}
        >
          {who}
        </div>
      </div>
      <div className="flex gap-2">
        <div
          className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 font-black text-[13px]"
          style={{
            background: "rgba(255,200,0,0.18)",
            color: "var(--color-brand-gold)",
            backdropFilter: "blur(8px)",
            letterSpacing: "-0.01em",
          }}
        >
          <Flame className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span className="num">{streak}</span>
        </div>
        <div
          className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 font-black text-[13px] text-white"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            letterSpacing: "-0.01em",
          }}
        >
          <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span className="num">{xp}</span>
        </div>
      </div>
    </header>
  );
}
