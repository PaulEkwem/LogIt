import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmitBody = {
  acquired: number;
  opened_same_day: number;
  total_opened: number;
  types: { t1: number; gt: number; t3: number; sm: number; sk: number };
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

  const { acquired, opened_same_day, total_opened, types } = body;
  if (
    !Number.isInteger(acquired) || acquired < 0 ||
    !Number.isInteger(opened_same_day) || opened_same_day < 0 || opened_same_day > acquired ||
    !Number.isInteger(total_opened) || total_opened < 0
  ) {
    return NextResponse.json({ error: "Invalid numbers" }, { status: 400 });
  }
  const sumTypes = types.t1 + types.gt + types.t3 + types.sm + types.sk;
  if (sumTypes !== total_opened) {
    return NextResponse.json({ error: "Per-type breakdown must sum to total opened" }, { status: 400 });
  }
  for (const v of [types.t1, types.gt, types.t3, types.sm, types.sk]) {
    if (!Number.isInteger(v) || v < 0) return NextResponse.json({ error: "Invalid type counts" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Upsert via user session (RLS enforces am_id == auth_am_id() and report_date == today)
  const { data: report, error: upErr } = await supabase
    .from("daily_reports")
    .upsert(
      {
        am_id: amId,
        report_date: today,
        acquired,
        opened_same_day,
        total_opened,
        type_t1: types.t1,
        type_t3: types.t3,
        type_gt: types.gt,
        type_sm: types.sm,
        type_sk: types.sk,
        edited_at: new Date().toISOString(),
      },
      { onConflict: "am_id,report_date" },
    )
    .select("id")
    .single();
  if (upErr || !report) {
    return NextResponse.json({ error: upErr?.message ?? "Failed to save report" }, { status: 500 });
  }

  const { data: amRow } = await supabase
    .from("account_managers")
    .select("daily_goal")
    .eq("id", amId)
    .single();
  const goal = amRow?.daily_goal ?? 15;
  const convPct = acquired > 0 ? Math.round((opened_same_day / acquired) * 100) : 0;
  const hitGoal = total_opened >= goal;

  return NextResponse.json({ ok: true, convPct, hitGoal });
}
