import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmitBody = {
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

  const meta = user.app_metadata as { am_id?: string; pc_id?: string; role?: string };
  if (meta.role === "admin" || !meta.am_id || !meta.pc_id) {
    return NextResponse.json({ error: "Only AMs can submit retention" }, { status: 403 });
  }

  const pledges = cleanNonNeg(body.pledges_naira_m);
  const inflow  = cleanNonNeg(body.inflow_naira_m);
  const outflow = cleanNonNeg(body.outflow_naira_m);

  if ([pledges, inflow, outflow].some((v) => Number.isNaN(v))) {
    return NextResponse.json({ error: "Pledges, inflow, and outflow must be non-negative ₦M numbers" }, { status: 400 });
  }

  // Net retention = inflow - outflow. Can be negative (net outflow day).
  const retention = Math.round((inflow - outflow) * 100) / 100;

  const today = new Date().toISOString().slice(0, 10);

  const { error: upErr } = await supabase
    .from("retention_reports")
    .upsert(
      {
        pc_id: meta.pc_id,
        report_date: today,
        pledges_naira_m: pledges,
        inflow_naira_m: inflow,
        outflow_naira_m: outflow,
        retention_naira_m: retention,
        filled_by_am_id: meta.am_id,
        edited_at: new Date().toISOString(),
      },
      { onConflict: "pc_id,report_date" },
    );

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, retention });
}
