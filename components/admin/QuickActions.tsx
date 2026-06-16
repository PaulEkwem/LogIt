import Link from "next/link";
import { PlayCircle, Download, FileBarChart2, Users2 } from "lucide-react";

export function QuickActions({
  pdfHref,
}: {
  pdfHref: string | null;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Tile href="#windows" icon={<PlayCircle className="w-4 h-4" />} label="Manage windows" />
      {pdfHref ? (
        <Tile href={pdfHref} icon={<Download className="w-4 h-4" />} label="Today's PDF" external />
      ) : (
        <DisabledTile icon={<Download className="w-4 h-4" />} label="Today's PDF" hint="None filed" />
      )}
      <Tile href="/admin/reports"   icon={<FileBarChart2 className="w-4 h-4" />} label="History" />
      <Tile href="/admin/teams"     icon={<Users2 className="w-4 h-4" />}        label="Teams & AMs" />
    </div>
  );
}

function Tile({ href, icon, label, external = false }: { href: string; icon: React.ReactNode; label: string; external?: boolean }) {
  const isHash = href.startsWith("#");
  const className = "rounded-xl px-3 py-2.5 flex items-center gap-2 transition-transform active:scale-[0.98]";
  const style = { background: "white", border: "1.5px solid var(--color-line)" } as const;
  const inner = (
    <>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(206,17,38,0.08)", color: "var(--color-brand-red)" }}>
        {icon}
      </span>
      <span className="font-extrabold text-[12px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.005em" }}>
        {label}
      </span>
    </>
  );
  if (external) {
    return <a href={href} target="_blank" rel="noopener" className={className} style={style}>{inner}</a>;
  }
  if (isHash) {
    return <a href={href} className={className} style={style}>{inner}</a>;
  }
  return <Link href={href} className={className} style={style}>{inner}</Link>;
}

function DisabledTile({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex items-center gap-2 opacity-50 cursor-not-allowed"
      style={{ background: "white", border: "1.5px dashed var(--color-line)" }}
      title={hint}
    >
      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F1F5F9", color: "var(--color-muted)" }}>
        {icon}
      </span>
      <span className="font-extrabold text-[12px]" style={{ color: "var(--color-muted)", letterSpacing: "-0.005em" }}>
        {label}
      </span>
    </div>
  );
}
