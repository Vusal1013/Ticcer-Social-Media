-- Run this in Supabase Dashboard -> SQL Editor
-- Adds cover image, category, privacy columns and storage bucket for communities

-- 1. Add new columns to communities table
ALTER TABLE communities ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'invite_only'));

-- 2. Storage bucket for community covers
INSERT INTO storage.buckets (id, name, public) VALUES ('community-covers', 'community-covers', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view community-covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload community-covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own community-covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own community-covers" ON storage.objects;

CREATE POLICY "Anyone can view community-covers" ON storage.objects FOR SELECT USING (bucket_id = 'community-covers');
CREATE POLICY "Users can upload community-covers" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'community-covers' AND auth.role() = 'authenticated'
);
CREATE POLICY "Users can update own community-covers" ON storage.objects FOR UPDATE USING (
  bucket_id = 'community-covers' AND auth.uid() IS NOT NULL
);
CREATE POLICY "Users can delete own community-covers" ON storage.objects FOR DELETE USING (
  bucket_id = 'community-covers' AND auth.uid() IS NOT NULL
);

-- 3. Join requests table (for private communities)
CREATE TABLE IF NOT EXISTS community_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own requests" ON community_join_requests;
DROP POLICY IF EXISTS "Users can create requests" ON community_join_requests;
DROP POLICY IF EXISTS "Admins can view requests" ON community_join_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON community_join_requests;

CREATE POLICY "Users can view own requests" ON community_join_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create requests" ON community_join_requests FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM communities WHERE id = community_id AND privacy = 'private')
);
CREATE POLICY "Admins can view requests" ON community_join_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM communities WHERE id = community_join_requests.community_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins can update requests" ON community_join_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM communities WHERE id = community_join_requests.community_id AND owner_id = auth.uid())
);

-- 4. Invites table (for invite_only communities)
CREATE TABLE IF NOT EXISTS community_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_uses INT DEFAULT NULL,
  use_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage invites" ON community_invites;
DROP POLICY IF EXISTS "Anyone can verify invite" ON community_invites;

CREATE POLICY "Admins manage invites" ON community_invites FOR ALL USING (
  EXISTS (SELECT 1 FROM communities WHERE id = community_invites.community_id AND owner_id = auth.uid())
);
CREATE POLICY "Anyone can verify invite" ON community_invites FOR SELECT USING (true);

-- 5. Function to join via invite code
CREATE OR REPLACE FUNCTION join_community_by_invite(invite_code TEXT, user_id UUID)
RETURNS UUID AS $$
DECLARE
  inv community_invites;
  com communities;
  member_id UUID;
BEGIN
  SELECT * INTO inv FROM community_invites WHERE code = invite_code;
  IF inv IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT * INTO com FROM communities WHERE id = inv.community_id;
  IF com.privacy != 'invite_only' THEN
    RAISE EXCEPTION 'Community is not invite-only';
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invite code has expired';
  END IF;

  IF inv.max_uses IS NOT NULL AND inv.use_count >= inv.max_uses THEN
    RAISE EXCEPTION 'Invite code has reached max uses';
  END IF;

  INSERT INTO community_members (community_id, user_id, role)
  VALUES (inv.community_id, user_id, 'member')
  RETURNING id INTO member_id;

  UPDATE community_invites SET use_count = use_count + 1 WHERE id = inv.id;

  RETURN member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Topluluq verification sistemi (az taninmis = bronze, cox taninmis = platinum)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS verified_type TEXT DEFAULT null CHECK (verified_type IS NULL OR verified_type IN ('bronze', 'platinum'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'verified') THEN
    UPDATE communities SET verified_type = 'bronze' WHERE verified = true AND verified_type IS NULL;
    ALTER TABLE communities DROP COLUMN verified;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION auto_verify_community()
RETURNS TRIGGER AS $$
DECLARE
  member_count INT;
BEGIN
  SELECT COUNT(*) INTO member_count FROM community_members WHERE community_id = NEW.community_id;

  IF member_count >= 2 THEN
    UPDATE communities SET verified_type = 'platinum' WHERE id = NEW.community_id;
  ELSIF member_count >= 1 THEN
    UPDATE communities SET verified_type = 'bronze' WHERE id = NEW.community_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_member_insert ON community_members;
CREATE TRIGGER on_member_insert
  AFTER INSERT ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_verify_community();
