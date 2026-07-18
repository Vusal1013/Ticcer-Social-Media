-- Run this if you already have tables from first migration
-- Adds storage + verification columns

-- 1. Add missing columns to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
ALTER TABLE communities ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- 2. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload post-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view reels" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload reels" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload stories" ON storage.objects;

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Anyone can view post-images" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Users can upload post-images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'post-images' AND auth.role() = 'authenticated'
);
CREATE POLICY "Anyone can view reels" ON storage.objects FOR SELECT USING (bucket_id = 'reels');
CREATE POLICY "Users can upload reels" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'reels' AND auth.role() = 'authenticated'
);
CREATE POLICY "Anyone can view stories" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "Users can upload stories" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'stories' AND auth.role() = 'authenticated'
);

-- 3. Admin policy
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
