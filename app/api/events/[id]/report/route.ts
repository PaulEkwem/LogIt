import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/events/[id]/report — AM submits/updates their numbers for a campaign.
 * Body: { acquired, total_opened, types: { t1, t3, gt, sm, sk } }
 * - total_opened must be <= acquired
 * - per-type breakdown must sum to total_opened (mirrors daily_reports)
 * Idempotent upsert by (event_id, am_id).
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await ctx.params;

  let body: {
    acquired?: number;
    total_opened?: number;
    types?: { t1?: number; t3?: number; gt?: number; sm?: number; sk?: number };
  };
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
  const total_opened = body.total_opened ?? 0;
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
  if (!Number.isInteger(total_opened) || total_opened < 0 || total_opened > acquired) {
    return NextResponse.json({ error: "Opened must be between 0 and acquired" }, { status: 400 });
  }
  const sumTypes = types.t1 + types.t3 + types.gt + types.sm + types.sk;
  if (sumTypes !== total_opened) {
    return NextResponse.json({ error: "Breakdown must sum to opened" }, { status: 400 });
  }
  for (const v of Object.values(types)) {
    if (!Number.isInteger(v) || v < 0) return NextResponse.json({ error: "Invalid type counts" }, { status: 400 });
  }

  const { data: ev } = await supabase.from("events").select("id, status").eq("id", eventId).maybeSingle();
  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (ev.status === "closed") return NextResponse.json({ error: "Event is closed" }, { status: 400 });

  const { error } = await supabase
    .from("event_reports")
    .upsert(
      {
        event_id: eventId,
        am_id: amId,
        acquired,
        total_opened,
        type_t1: types.t1,
        type_t3: types.t3,
        type_gt: types.gt,
        type_sm: types.sm,
        type_sk: types.sk,
        edited_at: new Date().toISOString(),
      },
      { onConflict: "event_id,am_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
