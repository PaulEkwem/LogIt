import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmitBody = {
  acquired?: number;
  opened_same_day?: number;
};

export async function POST(request: Request) {
  let body: SubmitBody;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { am_id?: string; role?: string };
  if (meta.role === "admin" || !meta.am_id) {
    return NextResponse.json({ error: "Only AMs can submit reports" }, { status: 403 });
  }
  const amId = meta.am_id;

  const acquired = body.acquired;
  const opened_same_day = body.opened_same_day;

  if (
    !Number.isInteger(acquired) || (acquired as number) < 0 ||
    !Number.isInteger(opened_same_day) || (opened_same_day as number) < 0 || (opened_same_day as number) > (acquired as number)
  ) {
    return NextResponse.json({ error: "Invalid numbers" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Schema kept for backward compat: total_opened mirrors opened_same_day now,
  // per-type and POS fields default to 0 / empty (constraint was dropped in 0008).
  const { data: report, error: upErr } = await supabase
    .from("daily_reports")
    .upsert(
      {
        am_id: amId,
        report_date: today,
        acquired: acquired as number,
        opened_same_day: opened_same_day as number,
        total_opened: opened_same_day as number,
        type_t1: 0,
        type_t3: 0,
        type_gt: 0,
        type_sm: 0,
        type_sk: 0,
        pos_prospects: [],
        edited_at: new Date().toISOString(),
      },
      { onConflict: "am_id,report_date" },
    )
    .select("id")
    .single();
  if (upErr || !report) {
    return NextResponse.json({ error: upErr?.message ?? "Failed to save report" }, { status: 500 });
  }

  const a = acquired as number;
  const o = opened_same_day as number;
  const convPct = a > 0 ? Math.round((o / a) * 100) : 0;

  return NextResponse.json({ ok: true, convPct });
}
