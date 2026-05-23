import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/events/[id]/report — AM submits/updates their numbers for an event.
 * Body: { acquired, types: { t1, t3, gt, sm, sk } }
 * Idempotent upsert by (event_id, am_id). Awards XP via ledger using admin client
 * (xp_ledger has no client INSERT policy).
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await ctx.params;

  let body: { acquired?: number; types?: { t1?: number; t3?: number; gt?: number; sm?: number; sk?: number } };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { role?: string; am_id?: string };
  if (meta.role === "admin" || !meta.am_id) {
    return NextResponse.json({ error: "Only AMs can submit event reports" }, { status: 403 });
  }
  const amId = meta.am_id;

  const acquired = body.acquired ?? 0;
  const types = {
    t1: body.types?.t1 ?? 0,
    t3: body.types?.t3 ?? 0,
    gt: body.types?.gt ?? 0,
    sm: body.types?.sm ?? 0,
    sk: body.types?.sk ?? 0,
  };

  if (!Number.isInteger(acquired) || acquired < 0) {
    return NextResponse.json({ error: "Invalid acquired" }, { status: 400 });
  }
  const sumTypes = types.t1 + types.t3 + types.gt + types.sm + types.sk;
  if (sumTypes !== acquired) {
    return NextResponse.json({ error: "Breakdown must sum to acquired" }, { status: 400 });
  }
  for (const v of Object.values(types)) {
    if (!Number.isInteger(v) || v < 0) return NextResponse.json({ error: "Invalid type counts" }, { status: 400 });
  }

  // Validate that the event exists and is in the AM's division (RLS will enforce this too).
  const { data: ev } = await supabase.from("events").select("id, status").eq("id", eventId).maybeSingle();
  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (ev.status === "closed") return NextResponse.json({ error: "Event is closed" }, { status: 400 });

  const { data: report, error } = await supabase
    .from("event_reports")
    .upsert(
      {
        event_id: eventId,
        am_id: amId,
        acquired,
        type_t1: types.t1,
        type_t3: types.t3,
        type_gt: types.gt,
        type_sm: types.sm,
        type_sk: types.sk,
        edited_at: new Date().toISOString(),
      },
      { onConflict: "event_id,am_id" },
    )
    .select("id")
    .single();
  if (error || !report) return NextResponse.json({ error: error?.message ?? "Save failed" }, { status: 500 });

  // XP: +5 per acquired + +20 participation bonus (paid once per event)
  const admin = createSupabaseAdminClient();
  await admin.from("xp_ledger").delete().eq("event_report_id", report.id);

  const rows: { am_id: string; amount: number; reason: string; event_report_id: string }[] = [];
  if (acquired > 0) {
    rows.push({ am_id: amId, amount: acquired * 5, reason: "event_acquired", event_report_id: report.id });
  }
  rows.push({ am_id: amId, amount: 20, reason: "event_participation", event_report_id: report.id });
  const { error: xpErr } = await admin.from("xp_ledger").insert(rows);
  if (xpErr) return NextResponse.json({ error: xpErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    xpTotal: acquired * 5 + 20,
    breakdown: [
      ...(acquired > 0 ? [{ label: `${acquired} acquired at the event`, amount: acquired * 5 }] : []),
      { label: "Event participation", amount: 20, bonus: true },
    ],
  });
}
