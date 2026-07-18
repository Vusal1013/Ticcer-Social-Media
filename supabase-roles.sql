-- Ticcer - Role system & channel permissions
-- Run after supabase-migration.sql and supabase-channels.sql

-- 1. Add screen_sharing to voice_participants
ALTER TABLE voice_participants ADD COLUMN IF NOT EXISTS screen_sharing BOOLEAN DEFAULT false;

-- 1.5 Update existing roles permissions default
ALTER TABLE community_roles ALTER COLUMN permissions SET DEFAULT '{"can_read": true, "can_write": true, "can_voice": false, "manage_channels": false, "manage_roles": false, "manage_members": false, "manage_messages": false, "manage_community": false}';

-- 2. Community custom roles
CREATE TABLE IF NOT EXISTS community_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6C63FF',
  permissions JSONB DEFAULT '{"can_read": true, "can_write": true, "can_voice": false, "manage_channels": false, "manage_roles": false, "manage_members": false, "manage_messages": false, "manage_community": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, name)
);

ALTER TABLE community_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view roles" ON community_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON community_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON community_roles;

CREATE POLICY "Members can view roles" ON community_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = community_roles.community_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage roles" ON community_roles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = community_roles.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);
CREATE POLICY "Admins can update roles" ON community_roles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = community_roles.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);
CREATE POLICY "Admins can delete roles" ON community_roles FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = community_roles.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);

-- 3. Role assignments (many-to-many: users <-> roles)
CREATE TABLE IF NOT EXISTS role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES community_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view role assignments" ON role_assignments;
DROP POLICY IF EXISTS "Admins can assign roles" ON role_assignments;
DROP POLICY IF EXISTS "Admins can remove role assignments" ON role_assignments;

CREATE POLICY "Members can view role assignments" ON role_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = role_assignments.community_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can assign roles" ON role_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = role_assignments.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);
CREATE POLICY "Admins can remove role assignments" ON role_assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = role_assignments.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);

-- 4. Channel permissions (role-based channel access)
CREATE TABLE IF NOT EXISTS channel_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES community_roles(id) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT true,
  can_write BOOLEAN DEFAULT true,
  can_voice BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, role_id)
);

ALTER TABLE channel_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view channel permissions" ON channel_permissions;
DROP POLICY IF EXISTS "Admins can manage channel permissions" ON channel_permissions;
DROP POLICY IF EXISTS "Admins can delete channel permissions" ON channel_permissions;

CREATE POLICY "Members can view channel permissions" ON channel_permissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = channel_permissions.channel_id AND cm.user_id = auth.uid())
);
CREATE POLICY "Admins can manage channel permissions" ON channel_permissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = channel_permissions.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);
CREATE POLICY "Admins can update channel permissions" ON channel_permissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = channel_permissions.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);
CREATE POLICY "Admins can delete channel permissions" ON channel_permissions FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = channel_permissions.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

-- 5. Storage bucket for community audio files (giris/cixis sesleri)
INSERT INTO storage.buckets (id, name, public) VALUES ('community-audio', 'community-audio', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view community audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload community audio" ON storage.objects;

CREATE POLICY "Anyone can view community audio" ON storage.objects FOR SELECT USING (bucket_id = 'community-audio');
CREATE POLICY "Admins can upload community audio" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'community-audio' AND auth.role() = 'authenticated'
);

-- 6. Ses dosyalarini yuklemek ucun:
--    Supabase Dashboard -> Storage -> community-audio bucket -> Upload
--    Fayllar: giris_ses.mp3 (otoq qatilanda), cixis_ses.mp3 (otoq terk edende)
