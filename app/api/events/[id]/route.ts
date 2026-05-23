import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * PATCH /api/events/[id] — admin updates an event (status, dates, name, location).
 * Most common use: { status: "closed" } to close an active campaign.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: { status?: string; name?: string; location?: string; start_date?: string; end_date?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if ((user.app_metadata as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const patch: Record<string, string | null> = {};
  if (body.status !== undefined) {
    if (!["upcoming", "active", "closed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "closed") patch.closed_at = new Date().toISOString();
  }
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.location !== undefined) patch.location = body.location.trim();
  if (body.start_date !== undefined) patch.start_date = body.start_date;
  if (body.end_date !== undefined) patch.end_date = body.end_date;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase.from("events").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, event: data });
}
