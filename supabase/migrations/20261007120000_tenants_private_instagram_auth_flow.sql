ALTER TABLE tenants_private
  ADD COLUMN IF NOT EXISTS instagram_auth_flow text;

COMMENT ON COLUMN tenants_private.instagram_auth_flow IS
  'instagram_login = OAuth via instagram.com; facebook_login = Meta/Facebook Page flow; NULL = legacy (facebook graph)';
