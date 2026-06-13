import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WindowAction = "open" | "close";
type ReportType = "acquisition" | "retention";
type Slot = "single" | "midday" | "eod";

type Body = {
  action?: WindowAction;
  report_type?: ReportType;
  slot?: Slot;
};

const VALID_SLOTS: Record<ReportType, Slot[]> = {
  acquisition: ["single"],
  retention: ["midday", "eod"],
};

export async function POST(request: Request) {
  let body: Body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { role?: string; division_id?: string };
  if (meta.role !== "admin" || !meta.division_id) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const action = body.action;
  const type = body.report_type;
  const slot = body.slot;

  if (action !== "open" && action !== "close") {
    return NextResponse.json({ error: "action must be 'open' or 'close'" }, { status: 400 });
  }
  if (type !== "acquisition" && type !== "retention") {
    return NextResponse.json({ error: "report_type must be 'acquisition' or 'retention'" }, { status: 400 });
  }
  if (!slot || !VALID_SLOTS[type].includes(slot)) {
    return NextResponse.json({ error: `slot must be one of ${VALID_SLOTS[type].join(", ")}` }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  if (action === "open") {
    // If a row already exists for this window today, return it (idempotent open).
    const { data: existing } = await supabase
      .from("report_windows")
      .select("id, opened_at, closed_at")
      .eq("division_id", meta.division_id)
      .eq("report_type", type)
      .eq("report_date", today)
      .eq("slot", slot)
      .maybeSingle();

    if (existing) {
      // Re-opening a previously closed window for the same day clears closed_at.
      if (existing.closed_at) {
        const { error: reErr } = await supabase
          .from("report_windows")
          .update({ closed_at: null, closed_by: null, closed_reason: null })
          .eq("id", existing.id);
        if (reErr) return NextResponse.json({ error: reErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: existing.id });
    }

    const { data: inserted, error: insErr } = await supabase
      .from("report_windows")
      .insert({
        division_id: meta.division_id,
        report_type: type,
        report_date: today,
        slot,
        opened_by: user.id,
      })
      .select("id")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: inserted.id });
  }

  // action === 'close'
  const { error: closeErr } = await supabase
    .from("report_windows")
    .update({ closed_at: new Date().toISOString(), closed_by: user.id, closed_reason: "manual" })
    .eq("division_id", meta.division_id)
    .eq("report_type", type)
    .eq("report_date", today)
    .eq("slot", slot)
    .is("closed_at", null);

  if (closeErr) return NextResponse.json({ error: closeErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
