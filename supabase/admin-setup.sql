-- Zero Fear admin panel: run this once in Supabase → SQL Editor → New query → Run.
-- It is safe to run again; it only creates what is missing.
--
-- Before running: change the e-mail on the line marked  <-- YOUR E-MAIL
-- After running:  Authentication → Users → Add user → same e-mail + a strong password.

-- 1. Who may edit the site ---------------------------------------------------
create table if not exists public.admin_users (
  email text primary key
);
insert into public.admin_users (email) values ('frndimon@gmail.com')  -- <-- YOUR E-MAIL
on conflict do nothing;
alter table public.admin_users enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "admins read admins" on public.admin_users;
create policy "admins read admins" on public.admin_users for select using (public.is_admin());

-- 2. Site text, photos, order, contact details (one JSON document) ----------
create table if not exists public.site_content (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.site_content enable row level security;
drop policy if exists "public read content" on public.site_content;
create policy "public read content" on public.site_content for select using (key = 'site');
drop policy if exists "admins write content" on public.site_content;
create policy "admins write content" on public.site_content for all using (public.is_admin()) with check (public.is_admin());

-- Earlier versions of the saved content, so a mistake can be undone.
create table if not exists public.site_content_history (
  id bigint generated always as identity primary key,
  key text not null,
  data jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by text
);
alter table public.site_content_history enable row level security;
drop policy if exists "admins history" on public.site_content_history;
create policy "admins history" on public.site_content_history for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.keep_content_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.site_content_history (key, data, saved_at, saved_by) values (old.key, old.data, old.updated_at, old.updated_by);
    delete from public.site_content_history
      where key = old.key and id not in (
        select id from public.site_content_history where key = old.key order by id desc limit 50);
  end if;
  return new;
end;
$$;
drop trigger if exists site_content_history on public.site_content;
create trigger site_content_history before update on public.site_content
  for each row execute function public.keep_content_history();

-- 3. Blog posts ----------------------------------------------------------------
create table if not exists public.posts (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) <= 90),
  description text not null default '' check (char_length(description) <= 200),
  category text not null default 'Guide',
  body text not null default '',
  cover jsonb,
  gallery jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  heading_font text,
  date date not null default current_date,
  updated_at timestamptz,
  draft boolean not null default true
);
alter table public.posts enable row level security;
drop policy if exists "public read posts" on public.posts;
create policy "public read posts" on public.posts for select using (draft = false or public.is_admin());
drop policy if exists "admins write posts" on public.posts;
create policy "admins write posts" on public.posts for all using (public.is_admin()) with check (public.is_admin());

-- 4. Photo storage (public to view, only admins can upload or delete) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true;

-- Public buckets serve files by URL without a select policy, so the file list stays private.
drop policy if exists "site-media public read" on storage.objects;
drop policy if exists "site-media admin insert" on storage.objects;
create policy "site-media admin insert" on storage.objects for insert with check (bucket_id = 'site-media' and public.is_admin());
drop policy if exists "site-media admin update" on storage.objects;
create policy "site-media admin update" on storage.objects for update using (bucket_id = 'site-media' and public.is_admin());
drop policy if exists "site-media admin delete" on storage.objects;
create policy "site-media admin delete" on storage.objects for delete using (bucket_id = 'site-media' and public.is_admin());
