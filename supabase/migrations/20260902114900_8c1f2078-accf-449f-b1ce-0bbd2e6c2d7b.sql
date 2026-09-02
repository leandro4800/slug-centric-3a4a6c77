create table if not exists public.suporte_tutoriais (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  conteudo text,
  video_url text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.suporte_tutoriais to authenticated;
grant select on public.suporte_tutoriais to anon;
grant insert, update, delete on public.suporte_tutoriais to authenticated;
grant all on public.suporte_tutoriais to service_role;

alter table public.suporte_tutoriais enable row level security;

drop policy if exists "suporte_tutoriais_read" on public.suporte_tutoriais;
create policy "suporte_tutoriais_read" on public.suporte_tutoriais
for select to authenticated, anon using (ativo = true or public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "suporte_tutoriais_admin_write" on public.suporte_tutoriais;
create policy "suporte_tutoriais_admin_write" on public.suporte_tutoriais
for all to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));