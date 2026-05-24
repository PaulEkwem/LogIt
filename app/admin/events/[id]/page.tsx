import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminEventRecap } from "@/components/AdminEventRecap";

export const dynamic = "force-dynamic";

export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, division_id, name, location, start_date, end_date, status, created_by, created_at, closed_at, division:divisions(name)")
    .eq("id", id)
    .single();
  if (!event) notFound();

  // Admin sees everything in their division (RLS allows it)
  const { data: reports } = await supabase
    .from("event_reports")
    .select("id, acquired, total_opened, type_t1, type_t3, type_gt, type_sm, type_sk, pos_prospects, submitted_at, edited_at, am:account_managers(id, full_name, initials, color, am_code, pc:pcs(id, name, pc_code))")
    .eq("event_id", id)
    .order("acquired", { ascending: false });

  // Group by PC + compute totals
  type AmRow = {
    id: string;
    full_name: string;
    initials: string;
    color: string;
    am_code: string;
    acquired: number;
    opened: number;
    types: { t1: number; t3: number; gt: number; sm: number; sk: number };
    pos_prospects: { name: string; business_type: string; min_turnover: number }[];
  };

  type PcRow = {
    pc_id: string;
    pc_name: string;
    pc_code: string;
    acquired: number;
    opened: number;
    ams: AmRow[];
  };

  const pcMap = new Map<string, PcRow>();
  let totalAcquired = 0;
  let totalOpened = 0;
  const totalTypes = { t1: 0, t3: 0, gt: 0, sm: 0, sk: 0 };

  for (const r of (reports ?? [])) {
    // @ts-expect-error nested supabase select typing
    const am = r.am as { id: string; full_name: string; initials: string; color: string; am_code: string; pc: { id: string; name: string; pc_code: string } } | null;
    if (!am) continue;
    const pcId = am.pc.id;
    if (!pcMap.has(pcId)) {
      pcMap.set(pcId, {
        pc_id: pcId,
        pc_name: am.pc.name,
        pc_code: am.pc.pc_code,
        acquired: 0,
        opened: 0,
        ams: [],
      });
    }
    const pcRow = pcMap.get(pcId)!;
    pcRow.acquired += r.acquired;
    pcRow.opened += r.total_opened;
    pcRow.ams.push({
      id: am.id,
      full_name: am.full_name,
      initials: am.initials,
      color: am.color,
      am_code: am.am_code,
      acquired: r.acquired,
      opened: r.total_opened,
      types: {
        t1: r.type_t1, t3: r.type_t3, gt: r.type_gt, sm: r.type_sm, sk: r.type_sk,
      },
      pos_prospects: (r.pos_prospects ?? []) as { name: string; business_type: string; min_turnover: number }[],
    });
    totalAcquired += r.acquired;
    totalOpened += r.total_opened;
    totalTypes.t1 += r.type_t1;
    totalTypes.t3 += r.type_t3;
    totalTypes.gt += r.type_gt;
    totalTypes.sm += r.type_sm;
    totalTypes.sk += r.type_sk;
  }

  const byPc = Array.from(pcMap.values()).sort((a, b) => b.opened - a.opened);
  const totalParticipants = (reports ?? []).length;

  // @ts-expect-error supabase nested
  const divisionName: string = event.division?.name ?? "";

  return (
    <AdminEventRecap
      event={event}
      divisionName={divisionName}
      byPc={byPc}
      totals={{
        acquired: totalAcquired,
        opened: totalOpened,
        participants: totalParticipants,
        conversion: totalAcquired > 0 ? Math.round((totalOpened / totalAcquired) * 100) : 0,
        types: totalTypes,
      }}
    />
  );
}
