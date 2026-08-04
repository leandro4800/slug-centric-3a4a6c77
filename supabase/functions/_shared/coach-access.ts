import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export async function assertCoachAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tenantId: string,
) {
  const { data: ownerTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (ownerTenant) return true;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, tenant_id")
    .eq("user_id", userId)
    .in("role", ["coach", "admin"]);

  return (roles ?? []).some(
    (r) => r.role === "admin" || (r.role === "coach" && r.tenant_id === tenantId),
  );
}
