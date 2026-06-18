-- AI Companion App - Enable Realtime for Image Updates
-- Run this in Supabase SQL Editor after previous migrations
--
-- This enables live push updates so the chat page knows when an
-- image generation completes without polling.
--
-- After running, also verify in Supabase Dashboard:
--   Database → Replication → ensure "images" table is listed under
--   "supabase_realtime" publication.

-- 1. Enable Realtime replication on the images table
--    (allows postgres_changes subscriptions to receive INSERT/UPDATE/DELETE events)
alter publication supabase_realtime add table images;

-- 2. Ensure RLS allows Realtime subscribers to read their own rows
--    (the existing "users can manage own images" policy already covers this
--     with "for all using (auth.uid() = user_id)")
