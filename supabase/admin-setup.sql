-- Zero Fear admin panel setup. Safe to run more than once (it never deletes anything).
-- Easiest: open /admin/setup on the website and follow the two steps there.
create table if not exists public.admin_users (email text primary key);
insert into public.admin_users (email) values ('frndimon@gmail.com') on conflict do nothing;
alter table public.admin_users enable row level security;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
create table if not exists public.site_content (
  key text primary key, data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), updated_by text);
alter table public.site_content enable row level security;
create table if not exists public.site_content_history (
  id bigint generated always as identity primary key, key text not null, data jsonb not null,
  saved_at timestamptz not null default now(), saved_by text);
alter table public.site_content_history enable row level security;
create or replace function public.keep_content_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.site_content_history (key, data, saved_at, saved_by) values (old.key, old.data, old.updated_at, old.updated_by);
    delete from public.site_content_history where key = old.key and id not in (
      select id from public.site_content_history where key = old.key order by id desc limit 50);
  end if;
  return new;
end; $$;
create or replace trigger site_content_history before update on public.site_content
  for each row execute function public.keep_content_history();
create table if not exists public.posts (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) <= 90),
  description text not null default '' check (char_length(description) <= 200),
  category text not null default 'Guide', body text not null default '',
  cover jsonb, gallery jsonb not null default '[]'::jsonb, keywords text[] not null default '{}',
  heading_font text, date date not null default current_date, updated_at timestamptz,
  draft boolean not null default true);
alter table public.posts enable row level security;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true;
do $$
declare p record;
begin
  for p in select * from (values
    ('public','admin_users','admins read admins','create policy "admins read admins" on public.admin_users for select using (public.is_admin())'),
    ('public','site_content','public read content','create policy "public read content" on public.site_content for select using (key = ''site'')'),
    ('public','site_content','admins write content','create policy "admins write content" on public.site_content for all using (public.is_admin()) with check (public.is_admin())'),
    ('public','site_content_history','admins history','create policy "admins history" on public.site_content_history for all using (public.is_admin()) with check (public.is_admin())'),
    ('public','posts','public read posts','create policy "public read posts" on public.posts for select using (draft = false or public.is_admin())'),
    ('public','posts','admins write posts','create policy "admins write posts" on public.posts for all using (public.is_admin()) with check (public.is_admin())'),
    ('storage','objects','site-media admin insert','create policy "site-media admin insert" on storage.objects for insert with check (bucket_id = ''site-media'' and public.is_admin())'),
    ('storage','objects','site-media admin update','create policy "site-media admin update" on storage.objects for update using (bucket_id = ''site-media'' and public.is_admin())'),
    ('storage','objects','site-media admin delete','create policy "site-media admin delete" on storage.objects for delete using (bucket_id = ''site-media'' and public.is_admin())')
  ) as t(sch, tbl, name, ddl)
  loop
    if not exists (select 1 from pg_policies where schemaname = p.sch and tablename = p.tbl and policyname = p.name) then
      execute p.ddl;
    end if;
  end loop;
end $$;
