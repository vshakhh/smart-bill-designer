
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
-- has_role is used inside RLS policies as auth.uid(), which the policy runs as authenticated; grant is still allowed for authenticated
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
