-- AI Companion App - Add Status to Images Table
-- Run this in Supabase SQL Editor after the initial schema

-- 1. Add status column with constraint
alter table if exists public.images
  add column if not exists status varchar(20) default 'completed' not null;

-- 2. Add error_message column for failed generations
alter table if exists public.images
  add column if not exists error_message text;

-- 3. Add index on status for faster pending-task queries
create index if not exists idx_images_status on public.images(status);

-- 4. Add index on user_id + status for per-user pending lookups
create index if not exists idx_images_user_status on public.images(user_id, status);
