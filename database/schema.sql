-- Supabase Database Schema for JohnnyFF15
-- Run this in your Supabase SQL Editor (Database > SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  pseudo text not null,
  credits integer not null default 10000,
  last_daily_bonus timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies
-- Users can view their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Users can insert their own profile (for new users)
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, pseudo, credits, last_daily_bonus)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1)),
    10000,
    null
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on profile changes
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

-- =====================================================
-- MATCH HISTORY TABLE
-- Stores Johnny's match history from Riot API
-- =====================================================

create table if not exists public.johnny_matches (
  id text primary key, -- Riot match ID (e.g., EUW1_1234567890)
  game_creation bigint not null, -- Timestamp when game was created
  game_duration integer not null, -- Game duration in seconds
  game_mode text not null, -- Game mode (e.g., CLASSIC)
  queue_id integer not null, -- Queue type ID

  -- Johnny's stats
  champion_id integer not null,
  champion_name text not null,
  kills integer not null default 0,
  deaths integer not null default 0,
  assists integer not null default 0,
  cs integer not null default 0, -- totalMinionsKilled + neutralMinionsKilled
  vision_score integer not null default 0,
  gold_earned integer not null default 0,
  damage_dealt integer not null default 0,

  -- Game result
  win boolean not null,
  first_blood_victim boolean not null default false,
  game_ended_surrender boolean not null default false,

  -- Team data (for comparison)
  team_kills integer not null default 0,

  -- Metadata
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster queries
create index if not exists idx_johnny_matches_game_creation on public.johnny_matches(game_creation desc);

-- Enable RLS (public read, no write from client - only server/admin)
alter table public.johnny_matches enable row level security;

-- Everyone can read matches (it's public data)
create policy "Anyone can view matches" on public.johnny_matches
  for select using (true);

-- Only authenticated users can insert (will be done via service role in production)
create policy "Authenticated users can insert matches" on public.johnny_matches
  for insert with check (auth.role() = 'authenticated');

-- =====================================================
-- JOHNNY CONFIG TABLE
-- Stores Johnny's Riot ID configuration
-- =====================================================

create table if not exists public.johnny_config (
  id integer primary key default 1,
  riot_id text not null, -- Format: GameName#Tag
  puuid text, -- Cached PUUID from Riot API
  region text not null default 'EUW',
  last_match_id text, -- Last known match ID (to detect new games)
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint single_row check (id = 1)
);

-- Enable RLS
alter table public.johnny_config enable row level security;

-- Everyone can read config
create policy "Anyone can view config" on public.johnny_config
  for select using (true);

-- Only authenticated users can update config
create policy "Authenticated users can update config" on public.johnny_config
  for update using (auth.role() = 'authenticated');

-- Insert default config
insert into public.johnny_config (id, riot_id, region)
values (1, 'Johnny#EUW', 'EUW')
on conflict (id) do nothing;
