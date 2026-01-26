-- Migration: Multi-Player Support
-- Run this in your Supabase SQL Editor to enable tracking multiple players

-- =====================================================
-- TRACKED PLAYERS TABLE (replaces johnny_config)
-- =====================================================

create table if not exists public.tracked_players (
  id uuid primary key default uuid_generate_v4(),
  game_name text not null,
  tag_line text not null,
  puuid text,
  region text not null default 'EUW',
  display_name text not null, -- Friendly name like "Johnny", "Rausteen"
  is_active boolean not null default true,
  last_match_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Ensure unique Riot ID per region
  unique(game_name, tag_line, region)
);

-- Enable RLS
alter table public.tracked_players enable row level security;

-- Everyone can view tracked players
create policy "Anyone can view tracked players" on public.tracked_players
  for select using (true);

-- Only authenticated users can insert/update/delete
create policy "Authenticated users can insert tracked players" on public.tracked_players
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update tracked players" on public.tracked_players
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete tracked players" on public.tracked_players
  for delete using (auth.role() = 'authenticated');

-- Indexes
create index if not exists idx_tracked_players_puuid on public.tracked_players(puuid);
create index if not exists idx_tracked_players_active on public.tracked_players(is_active);

-- =====================================================
-- PLAYER GAME STATUS TABLE (replaces game_status)
-- =====================================================

create table if not exists public.player_game_status (
  player_id uuid primary key references public.tracked_players(id) on delete cascade,
  is_in_game boolean not null default false,
  game_id text,
  game_data jsonb,
  last_check_at timestamp with time zone,
  last_checker_id text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.player_game_status enable row level security;

-- Everyone can view game status
create policy "Anyone can view player game status" on public.player_game_status
  for select using (true);

-- Authenticated users can manage game status
create policy "Authenticated users can insert player game status" on public.player_game_status
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update player game status" on public.player_game_status
  for update using (auth.role() = 'authenticated');

-- Realtime subscription
alter publication supabase_realtime add table public.player_game_status;

-- =====================================================
-- UPDATE BETS TABLE - Add player fields
-- =====================================================

alter table public.bets add column if not exists player_puuid text;
alter table public.bets add column if not exists player_name text;

-- Index for faster queries by player
create index if not exists idx_bets_player_puuid on public.bets(player_puuid);

-- =====================================================
-- UPDATE MATCHES TABLE - Rename and support multiple players
-- =====================================================

-- Rename johnny_matches to player_matches (or create new)
-- We'll keep the old table for backwards compatibility and add player support

alter table public.johnny_matches add column if not exists player_id uuid references public.tracked_players(id);
alter table public.johnny_matches add column if not exists player_name text;

-- Index for player queries
create index if not exists idx_johnny_matches_player_id on public.johnny_matches(player_id);

-- =====================================================
-- MIGRATE EXISTING DATA FROM johnny_config
-- =====================================================

-- If johnny_config exists, migrate the data to tracked_players
do $$
declare
  v_riot_id text;
  v_puuid text;
  v_region text;
begin
  -- Check if johnny_config has data
  select riot_id, puuid, region into v_riot_id, v_puuid, v_region
  from public.johnny_config
  where id = 1;

  if v_riot_id is not null then
    -- Insert Johnny as the first tracked player if not exists
    insert into public.tracked_players (game_name, tag_line, puuid, region, display_name, is_active)
    select
      split_part(v_riot_id, '#', 1),
      split_part(v_riot_id, '#', 2),
      v_puuid,
      v_region,
      'Johnny',
      true
    where not exists (
      select 1 from public.tracked_players where display_name = 'Johnny'
    );
  end if;
end $$;

-- =====================================================
-- HELPER FUNCTION: Get player by PUUID
-- =====================================================

create or replace function public.get_player_by_puuid(p_puuid text)
returns public.tracked_players as $$
  select * from public.tracked_players where puuid = p_puuid limit 1;
$$ language sql stable;
