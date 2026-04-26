-- ======================================================
-- PakdaRe — Production Database Indexes
-- Run these in Supabase Dashboard > SQL Editor
-- ======================================================
-- These indexes are critical for performance at 10K+ complaints.
-- Without them, every filter/map/SLA query does a full table scan.

-- 1. Primary query pattern: Get complaints by ward, newest first
--    Used by: MapPage (ward bubbles), AdminDashboard (filter by ward)
CREATE INDEX IF NOT EXISTS idx_complaints_ward_time
  ON complaints(ward, time DESC);

-- 2. SLA Engine: Find unresolved complaints by severity
--    Used by: useSLAEngine (breach detection), AdminDashboard (status filter)
CREATE INDEX IF NOT EXISTS idx_complaints_resolved_severity
  ON complaints(resolved, severity);

-- 3. Realtime subscription filter: recent unresolved complaints
--    Used by: useComplaints real-time subscription
CREATE INDEX IF NOT EXISTS idx_complaints_time_desc
  ON complaints(time DESC);

-- 4. Category filter (vector/water/etc.)
--    Used by: AdminDashboard, Complaints page
CREATE INDEX IF NOT EXISTS idx_complaints_category
  ON complaints(category);

-- 5. GPS-based queries (Officer resolve flow)
--    Partial index — only indexes rows that have lat/lng set
CREATE INDEX IF NOT EXISTS idx_complaints_gps
  ON complaints(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ======================================================
-- Verify indexes were created:
-- SELECT indexname, tablename FROM pg_indexes WHERE tablename = 'complaints';
-- ======================================================

-- ======================================================
-- Row Level Security — Verify These Policies Exist
-- Run in Supabase Dashboard > Authentication > Policies
-- ======================================================

-- Citizens can INSERT complaints (anon + authenticated)
-- CREATE POLICY "Citizens can file complaints"
--   ON complaints FOR INSERT
--   TO anon, authenticated
--   WITH CHECK (true);

-- Anyone can READ complaints (public health data)
-- CREATE POLICY "Public read complaints"
--   ON complaints FOR SELECT
--   TO anon, authenticated
--   USING (true);

-- Only authenticated staff can UPDATE (resolve, assign)
-- CREATE POLICY "Staff can update complaints"
--   ON complaints FOR UPDATE
--   TO authenticated
--   USING (auth.role() IN ('staff', 'officer', 'admin'));

-- NOBODY can DELETE complaints (audit trail must be preserved)
-- CREATE POLICY "No delete allowed"
--   ON complaints FOR DELETE
--   USING (false);

-- ======================================================
-- Supabase Storage — Create complaint-photos bucket
-- (Run once — or create via Storage UI)
-- ======================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('complaint-photos', 'complaint-photos', true);

-- Allow anyone to upload (citizens file without auth)
-- CREATE POLICY "Anyone can upload complaint photos"
--   ON storage.objects FOR INSERT
--   TO anon, authenticated
--   WITH CHECK (bucket_id = 'complaint-photos');

-- Public read for complaint photos
-- CREATE POLICY "Public read complaint photos"
--   ON storage.objects FOR SELECT
--   TO anon, authenticated
--   USING (bucket_id = 'complaint-photos');
