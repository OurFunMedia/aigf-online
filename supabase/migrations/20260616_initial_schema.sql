-- AI Companion App - Initial Schema Migration
-- Run this in Supabase SQL Editor

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create characters table
create table if not exists public.characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name varchar(255) not null,
  avatar_url text,
  personality_prompt text not null,
  visual_template text not null,
  relation_points integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create chats table
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  character_id uuid references public.characters(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  messages jsonb default '[]'::jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create images table
create table if not exists public.images (
  id uuid default gen_random_uuid() primary key,
  character_id uuid references public.characters(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  prompt text not null,
  storage_url text not null,
  scene_description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable Row Level Security
alter table public.characters enable row level security;
alter table public.chats enable row level security;
alter table public.images enable row level security;

-- 6. RLS Policies
drop policy if exists "users can manage own characters" on public.characters;
create policy "users can manage own characters" on public.characters
  for all using (auth.uid() = user_id);

drop policy if exists "users can manage own chats" on public.chats;
create policy "users can manage own chats" on public.chats
  for all using (auth.uid() = user_id);

drop policy if exists "users can manage own images" on public.images;
create policy "users can manage own images" on public.images
  for all using (auth.uid() = user_id);

-- 7. Storage bucket RLS (run separately in Storage > Policies)
-- INSERT: bucket_id = 'companion-photos' AND (storage.foldername(name))[1] = auth.uid()::text
-- SELECT: bucket_id = 'companion-photos'
