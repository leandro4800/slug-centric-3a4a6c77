import { supabase } from "@/integrations/supabase/client";

export async function saveAthleteProfilePhoto(userId: string, tenantId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Selecione uma foto de até 15 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/profile-${crypto.randomUUID()}.${extension}`;
  const uploaded = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throw uploaded.error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const result = await supabase.from("perfis").update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId).eq("tenant_id", tenantId).select("avatar_url").single();
  if (result.error) {
    await supabase.storage.from("avatars").remove([path]);
    throw result.error;
  }
  return result.data.avatar_url;
}