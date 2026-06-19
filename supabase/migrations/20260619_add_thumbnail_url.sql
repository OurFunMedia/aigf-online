-- AI Companion App - Add thumbnail_url to images table
-- Run this in Supabase SQL Editor after 20260617_add_image_status.sql

alter table if exists public.images
  add column if not exists thumbnail_url text;
