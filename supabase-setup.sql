-- Piano Roulette database setup
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New query.

create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  artist text not null default '',
  book text not null check (length(trim(book)) > 0),
  number text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.song_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  selected_at timestamptz not null default now(),
  constraint one_pick_per_song_per_user unique (user_id, song_id)
);

create index if not exists songs_user_book_idx on public.songs(user_id, book);
create index if not exists selections_user_idx on public.song_selections(user_id);

alter table public.songs enable row level security;
alter table public.song_selections enable row level security;

drop policy if exists "Users manage their own songs" on public.songs;
create policy "Users manage their own songs"
on public.songs for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their own selections" on public.song_selections;
create policy "Users manage their own selections"
on public.song_selections for all
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.songs
    where songs.id = song_id and songs.user_id = auth.uid()
  )
);

-- Optional: keep email confirmation enabled for better account security.
-- No service-role key is used in the browser. Only the anon/public key belongs in app.js.
