-- AI Companion App - Add Body Parameters Column
-- Run this in Supabase SQL Editor after the initial schema

-- 1. Add body_params JSONB column to characters table
alter table if exists public.characters
  add column if not exists body_params jsonb default '{}'::jsonb not null;

-- 2. Grant appropriate permissions (already granted via RLS on the table)
-- RLS policies already cover the table, so new column is automatically protected.
