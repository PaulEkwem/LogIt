import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Cron — closes every still-open report window at end-of-day.
 *
 * Vercel cron sends an `Authorization: Bearer <CRON_SECRET>` header. We
 * reject anything else so the endpoint isn't publicly hittable.
 *
 * Scheduled in vercel.json to fire at 22:59 UTC daily, which is 23:59
 * Lagos (UTC+1, no DST). We back-date closed_at to exactly 23:59 Lagos
 * of the report's own date so the audit log reads cleanly.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cron fires at 22:59 UTC = 23:59 Lagos, so today (UTC) == today (Lagos).
  const today = new Date().toISOString().slice(0, 10);
  const closedAt = `${today}T22:59:00.000Z`; // 23:59 Lagos
  const ranAt = new Date().toISOString();

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("report_windows")
    .update({ closed_at: closedAt, closed_reason: "expired" })
    .eq("report_date", today)
    .is("closed_at", null)
    .select("id, report_type, slot, division_id");

  if (error) {
    return NextResponse.json({ error: error.message, ran_at: ranAt }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ran_at: ranAt,
    closed_count: data?.length ?? 0,
    closed: data ?? [],
  });
}
