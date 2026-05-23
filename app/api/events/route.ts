import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/events — admin creates a cluster campaign.
 * Body: { name, location, start_date, end_date, pc_ids? }
 * pc_ids: optional subset of PCs to scope the event. Omit/empty = all PCs in the division.
 */
export async function POST(request: Request) {
  let body: { name?: string; location?: string; start_date?: string; end_date?: string; pc_ids?: string[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const meta = user.app_metadata as { role?: string; pc_id?: string };
  if (meta.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const name = (body.name ?? "").trim();
  const location = (body.location ?? "").trim();
  const start_date = (body.start_date ?? "").trim();
  const end_date = (body.end_date ?? "").trim();

  if (!name || !location) return NextResponse.json({ error: "Name and location required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    return NextResponse.json({ error: "Dates must be YYYY-MM-DD" }, { status: 400 });
  }
  if (end_date < start_date) return NextResponse.json({ error: "End date before start date" }, { status: 400 });

  // Look up the admin's division via their pc_id.
  const { data: pcRow } = await supabase.from("pcs").select("division_id").eq("id", meta.pc_id!).single();
  if (!pcRow?.division_id) return NextResponse.json({ error: "Division not resolvable" }, { status: 500 });

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      division_id: pcRow.division_id,
      name,
      location,
      start_date,
      end_date,
      status: "active",
      created_by: user.id,
    })
    .select()
    .single();
  if (error || !event) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });

  // Scope to specific PCs if provided.
  if (body.pc_ids && body.pc_ids.length > 0) {
    const rows = body.pc_ids.map((pc_id) => ({ event_id: event.id, pc_id }));
    const { error: pcErr } = await supabase.from("event_pcs").insert(rows);
    if (pcErr) return NextResponse.json({ error: pcErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event });
}
