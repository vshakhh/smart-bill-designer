import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertOwner(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: owner only");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,avatar_url,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const { data: roles, error: rErr } = await supabaseAdmin.from("user_roles").select("user_id,role");
    if (rErr) throw rErr;
    const byUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as string);
      byUser.set(r.user_id, arr);
    }
    return (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), status: z.enum(["approved", "pending", "revoke"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot change your own status");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Remove approved + pending; then set desired
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .in("role", ["approved", "pending"]);
    if (data.status === "approved") {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "approved" });
    } else if (data.status === "pending") {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "pending" });
    }
    return { ok: true };
  });
