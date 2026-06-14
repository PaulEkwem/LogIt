import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Action = "create" | "rename" | "archive" | "restore";

type Body = {
  action?: Action;
  pc_id?: string;
  name?: string;
  pc_code?: string;
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

  switch (body.action) {
    case "create": {
      const name = (body.name ?? "").trim();
      const code = (body.pc_code ?? "").trim();
      if (!name) return NextResponse.json({ error: "Team name required" }, { status: 400 });
      if (!/^\d{3}$/.test(code)) return NextResponse.json({ error: "PC code must be 3 digits" }, { status: 400 });

      // Reject duplicate code.
      const { data: existing } = await supabase.from("pcs").select("id").eq("pc_code", code).maybeSingle();
      if (existing) return NextResponse.json({ error: `PC code ${code} is already in use` }, { status: 409 });

      const { data, error } = await supabase
        .from("pcs")
        .insert({ name, pc_code: code, division_id: meta.division_id })
        .select("id").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: data.id });
    }

    case "rename": {
      const name = (body.name ?? "").trim();
      if (!body.pc_id || !name) return NextResponse.json({ error: "pc_id and name required" }, { status: 400 });
      const { error } = await supabase.from("pcs").update({ name }).eq("id", body.pc_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "archive": {
      if (!body.pc_id) return NextResponse.json({ error: "pc_id required" }, { status: 400 });
      const { error } = await supabase
        .from("pcs").update({ archived_at: new Date().toISOString() })
        .eq("id", body.pc_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "restore": {
      if (!body.pc_id) return NextResponse.json({ error: "pc_id required" }, { status: 400 });
      const { error } = await supabase
        .from("pcs").update({ archived_at: null }).eq("id", body.pc_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "action must be create|rename|archive|restore" }, { status: 400 });
  }
}
