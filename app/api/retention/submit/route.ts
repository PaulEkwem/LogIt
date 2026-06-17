import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { lagosDate } from "@/lib/time";

type Slot = "midday" | "eod";

type SubmitBody = {
  slot?: Slot;
  pledges_naira_m?: number;
  inflow_naira_m?: number;
  outflow_naira_m?: number;
};

function cleanNonNeg(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return NaN;
  return Math.round(v * 100) / 100;
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { am_id?: string; pc_id?: string; role?: string; division_id?: string };
  if (meta.role === "admin" || !meta.am_id || !meta.pc_id) {
    return NextResponse.json({ error: "Only AMs can submit retention" }, { status: 403 });
  }

  const slot = body.slot;
  if (slot !== "midday" && slot !== "eod") {
    return NextResponse.json({ error: "slot must be 'midday' or 'eod'" }, { status: 400 });
  }

  const pledges = cleanNonNeg(body.pledges_naira_m);
  const inflow  = cleanNonNeg(body.inflow_naira_m);
  const outflow = cleanNonNeg(body.outflow_naira_m);

  if ([pledges, inflow, outflow].some((v) => Number.isNaN(v))) {
    return NextResponse.json({ error: "Pledges, inflow, and outflow must be non-negative ₦M numbers" }, { status: 400 });
  }

  const retention = Math.round((inflow - outflow) * 100) / 100;
  const today = lagosDate();

  // RLS already requires an open window, but we also want to read the
  // division_id so we can auto-close once everyone's filed.
  const admin = createSupabaseAdminClient();
  const { data: divisionRow } = await admin
    .from("pcs").select("division_id").eq("id", meta.pc_id).maybeSingle();
  const divisionId = (divisionRow as { division_id?: string } | null)?.division_id;
  if (!divisionId) {
    return NextResponse.json({ error: "Could not resolve division" }, { status: 500 });
  }

  const { error: upErr } = await supabase
    .from("retention_reports")
    .upsert(
      {
        pc_id: meta.pc_id,
        report_date: today,
        slot,
        pledges_naira_m: pledges,
        inflow_naira_m: inflow,
        outflow_naira_m: outflow,
        retention_naira_m: retention,
        filled_by_am_id: meta.am_id,
        edited_at: new Date().toISOString(),
      },
      { onConflict: "pc_id,report_date,slot" },
    );

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Auto-close: if every PC in the division has now filed this slot, flip the
  // window closed.
  const [{ count: pcCount }, { count: filedCount }] = await Promise.all([
    admin.from("pcs").select("id", { count: "exact", head: true }).eq("division_id", divisionId),
    admin
      .from("retention_reports").select("id", { count: "exact", head: true })
      .eq("report_date", today).eq("slot", slot)
      .in("pc_id", (await admin.from("pcs").select("id").eq("division_id", divisionId)).data?.map((p) => p.id) ?? []),
  ]);

  if (pcCount && filedCount && filedCount >= pcCount) {
    await admin.from("report_windows").update({
      closed_at: new Date().toISOString(),
      closed_reason: "auto",
    })
    .eq("division_id", divisionId)
    .eq("report_type", "retention")
    .eq("report_date", today)
    .eq("slot", slot)
    .is("closed_at", null);
  }

  return NextResponse.json({ ok: true, retention, autoClosed: pcCount === filedCount });
}
