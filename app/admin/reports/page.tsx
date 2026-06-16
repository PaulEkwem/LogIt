import { FileBarChart2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.18em" }}>
          History
        </div>
        <h1 className="font-black text-[28px] mt-1.5" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em" }}>
          Reports history
        </h1>
      </div>

      <div className="rounded-2xl p-8 text-center" style={{ background: "white", border: "1.5px dashed var(--color-line)" }}>
        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "#F1F5F9", color: "var(--color-muted)" }}>
          <FileBarChart2 className="w-6 h-6" />
        </div>
        <div className="font-black text-[15px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
          Coming soon
        </div>
        <div className="font-bold text-[12px] mt-1 max-w-[400px] mx-auto" style={{ color: "var(--color-body)", lineHeight: 1.5 }}>
          Browse and re-download any past day&apos;s retention PDF. Daily acquisition history too.
          Today&apos;s PDFs are available from the Open a report page.
        </div>
      </div>
    </div>
  );
}
