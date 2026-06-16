import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AcquisitionLive, type AmEntry } from "@/components/admin/AcquisitionLive";
import { RetentionLive, type TeamEntry } from "@/components/admin/RetentionLive";
import Link from "next/link";
import { PlayCircle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtToday() {
  const d = new Date();
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const meta = user!.app_metadata as { pc_id?: string; division_id?: string };

  let divisionId = meta.division_id ?? "";
  if (!divisionId && meta.pc_id) {
    const { data } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
    divisionId = (data as { division_id?: string } | null)?.division_id ?? "";
  }

  const { data: division } = await supabase
    .from("divisions").select("name").eq("id", divisionId).maybeSingle();
  const divisionName = division?.name ?? "";

  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: pcs },
    { data: ams },
    { data: todaysReports },
    { data: retentionToday },
    { data: windows },
  ] = await Promise.all([
    supabase.from("pcs").select("id, name, pc_code").eq("division_id", divisionId).is("archived_at", null).order("name"),
    supabase.from("account_managers")
      .select("id, full_name, am_code, initials, color, pc_id")
      .is("archived_at", null),
    supabase.from("daily_reports").select("am_id, acquired, total_opened, opened_same_day, submitted_at").eq("report_date", today),
    supabase.from("retention_reports")
      .select("pc_id, slot, pledges_naira_m, inflow_naira_m, outflow_naira_m, retention_naira_m, filled_by_am_id, submitted_at")
      .eq("report_date", today),
    supabase.from("report_windows")
      .select("report_type, slot, opened_at, closed_at")
      .eq("division_id", divisionId).eq("report_date", today),
  ]);

  const pcById = new Map((pcs ?? []).map((p) => [p.id, p]));
  const findOpen = (type: "acquisition" | "retention", slot: string) =>
    (windows ?? []).find((w) => w.report_type === type && w.slot === slot && w.opened_at && !w.closed_at);

  const acquisitionOpen = !!findOpen("acquisition", "single");
  const middayOpen      = !!findOpen("retention", "midday");
  const eodOpen         = !!findOpen("retention", "eod");
  const nothingOpen     = !acquisitionOpen && !middayOpen && !eodOpen;

  // Acquisition entries
  const reportByAm = new Map((todaysReports ?? []).map((r) => [r.am_id, r]));
  const acquisitionEntries: AmEntry[] = (ams ?? []).map((am) => {
    const r = reportByAm.get(am.id);
    const pc = pcById.get(am.pc_id);
    const acquired = r?.acquired ?? 0;
    const opened = r?.total_opened ?? 0;
    const sameDay = r?.opened_same_day ?? 0;
    const conv = acquired > 0 ? Math.round((sameDay / acquired) * 100) : 0;
    return {
      id: am.id,
      full_name: am.full_name,
      am_code: am.am_code,
      initials: am.initials,
      color: am.color,
      pc_name: pc?.name ?? "",
      filed: !!r,
      acquired, opened, conv,
      submitted_at: r?.submitted_at ?? null,
    };
  });

  // Retention entries
  const fillerIds = Array.from(new Set((retentionToday ?? []).map((r) => r.filled_by_am_id)));
  const fillerById = new Map<string, { full_name: string; initials: string; color: string }>();
  if (fillerIds.length > 0) {
    const { data: fillers } = await supabase
      .from("account_managers").select("id, full_name, initials, color").in("id", fillerIds);
    for (const f of fillers ?? []) {
      fillerById.set(f.id, { full_name: f.full_name, initials: f.initials, color: f.color });
    }
  }

  function entriesForSlot(slot: "midday" | "eod"): TeamEntry[] {
    const slotRows = (retentionToday ?? []).filter((r) => r.slot === slot);
    const byPc = new Map(slotRows.map((r) => [r.pc_id, r]));
    return (pcs ?? []).map((pc) => {
      const r = byPc.get(pc.id);
      if (!r) {
        return {
          pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, filed: false,
          pledges: 0, inflow: 0, outflow: 0, net: 0,
          filled_by_name: null, filled_by_initials: null, filled_by_color: null,
          submitted_at: null,
        };
      }
      const f = fillerById.get(r.filled_by_am_id);
      return {
        pc_id: pc.id, pc_name: pc.name, pc_code: pc.pc_code, filed: true,
        pledges: Number(r.pledges_naira_m),
        inflow:  Number(r.inflow_naira_m),
        outflow: Number(r.outflow_naira_m),
        net:     Number(r.retention_naira_m),
        filled_by_name:     f?.full_name ?? null,
        filled_by_initials: f?.initials ?? null,
        filled_by_color:    f?.color ?? null,
        submitted_at: r.submitted_at,
      };
    });
  }

  const middayEntries = entriesForSlot("midday");
  const eodEntries    = entriesForSlot("eod");

  return (
    <div className="flex flex-col gap-8">
      <PageHead title="Dashboard" sub={`${divisionName} · ${fmtToday()}`} />

      {nothingOpen && (
        <div className="rounded-2xl p-8 text-center" style={{ background: "white", border: "1.5px dashed var(--color-line)" }}>
          <div className="text-[48px] mb-2" aria-hidden>📭</div>
          <div className="font-black text-[16px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
            No live report right now
          </div>
          <div className="font-bold text-[12px] mt-1 max-w-[420px] mx-auto" style={{ color: "var(--color-body)", lineHeight: 1.5 }}>
            Open one from <Link href="/admin/windows" className="font-extrabold underline" style={{ color: "var(--color-brand-red)" }}>Live reports</Link> when you&apos;re ready. AMs will be unlocked instantly.
          </div>
        </div>
      )}

      {acquisitionOpen && (
        <SectionBlock
          title="Customer acquisition"
          subtitle={`${acquisitionEntries.filter((e) => e.filed).length}/${acquisitionEntries.length} AMs filed`}
          href="/admin/windows"
        >
          <AcquisitionLive entries={acquisitionEntries} />
        </SectionBlock>
      )}

      {middayOpen && (
        <SectionBlock
          title="Retention · 12pm"
          subtitle={`${middayEntries.filter((e) => e.filed).length}/${middayEntries.length} teams filed`}
          href="/admin/windows"
        >
          <RetentionLive entries={middayEntries} />
        </SectionBlock>
      )}

      {eodOpen && (
        <SectionBlock
          title="Retention · 5pm"
          subtitle={`${eodEntries.filter((e) => e.filed).length}/${eodEntries.length} teams filed`}
          href="/admin/windows"
        >
          <RetentionLive entries={eodEntries} />
        </SectionBlock>
      )}

      {!nothingOpen && (
        <Link
          href="/admin/windows"
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "white", border: "1.5px solid var(--color-line)" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(206,17,38,0.08)", color: "var(--color-brand-red)" }}>
            <PlayCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-[13px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>Open or close windows</div>
            <div className="font-bold text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Controls + downloads live here</div>
          </div>
          <ArrowRight className="w-4 h-4" style={{ color: "var(--color-muted)" }} />
        </Link>
      )}
    </div>
  );
}

function SectionBlock({
  title, subtitle, href, children,
}: {
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-black text-[15px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
            {title}
          </div>
          <div className="font-bold text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            {subtitle}
          </div>
        </div>
        <Link href={href} className="font-extrabold text-[11px] inline-flex items-center gap-1" style={{ color: "var(--color-brand-red)" }}>
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <div className="font-extrabold text-[11px] uppercase" style={{ color: "var(--color-muted)", letterSpacing: "0.18em" }}>
        {sub}
      </div>
      <h1 className="font-black text-[28px] mt-1.5" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em" }}>
        {title}
      </h1>
    </div>
  );
}
