-- Zero Fear social scheduler (admin → Social). Safe to run more than once.
-- Needs admin-setup.sql first (is_admin()).

-- Connected Google locations, Facebook pages and Instagram accounts.
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google', 'facebook', 'instagram')),
  external_id text not null,   -- google: accounts/1/locations/2, facebook: page id, instagram: ig user id
  name text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider, external_id));
alter table public.social_accounts enable row level security;

-- Access tokens. No policies: only the website server (secret key) can read them.
create table if not exists public.social_tokens (
  account_id uuid primary key references public.social_accounts (id) on delete cascade,
  token jsonb not null,
  updated_at timestamptz not null default now());
alter table public.social_tokens enable row level security;

-- Scheduled posts and stories, one row per account.
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.social_accounts (id) on delete cascade,
  kind text not null default 'post' check (kind in ('post', 'story')),
  text text not null default '' check (char_length(text) <= 2200),
  image_url text,
  cta text check (cta in ('CALL', 'LEARN_MORE', 'BOOK')),
  cta_url text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('draft', 'scheduled', 'posting', 'posted', 'failed')),
  attempts int not null default 0,
  error text,
  external_id text,
  posted_at timestamptz,
  created_at timestamptz not null default now());
alter table public.social_posts enable row level security;
create index if not exists social_posts_due on public.social_posts (status, scheduled_at);

-- Google reviews and their replies.
create table if not exists public.social_reviews (
  id text primary key,         -- the review's resource name
  account_id uuid not null references public.social_accounts (id) on delete cascade,
  reviewer text not null default '',
  rating int not null default 0,
  comment text not null default '',
  created_time timestamptz,
  reply text not null default '',
  status text not null default 'new' check (status in ('new', 'drafted', 'posted', 'skipped', 'failed')),
  error text,
  updated_at timestamptz not null default now());
alter table public.social_reviews enable row level security;

create table if not exists public.social_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb);
alter table public.social_settings enable row level security;
insert into public.social_settings (key, value)
values ('reviews', '{"autoReply": true, "minRating": 4}') on conflict do nothing;

do $$
declare t text;
begin
  foreach t in array array['social_accounts', 'social_posts', 'social_reviews', 'social_settings'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'admins ' || t) then
      execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())', 'admins ' || t, t);
    end if;
  end loop;
end $$;

grant select, insert, update, delete on public.social_accounts, public.social_posts, public.social_reviews, public.social_settings to authenticated;
revoke all on public.social_tokens from anon, authenticated;
