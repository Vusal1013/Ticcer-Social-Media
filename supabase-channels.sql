-- Ticcer - Channel management additions
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Add channel settings columns
ALTER TABLE community_channels ADD COLUMN IF NOT EXISTS banned_words TEXT[] DEFAULT '{}';
ALTER TABLE community_channels ADD COLUMN IF NOT EXISTS slow_mode BOOLEAN DEFAULT false;
ALTER TABLE community_channels ADD COLUMN IF NOT EXISTS slow_mode_interval INT DEFAULT 0;

-- 2. Channel bans table
CREATE TABLE IF NOT EXISTS channel_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  banned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE channel_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view bans" ON channel_bans;
DROP POLICY IF EXISTS "Admins can ban users" ON channel_bans;
DROP POLICY IF EXISTS "Admins can unban" ON channel_bans;

CREATE POLICY "Members can view bans" ON channel_bans FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = channel_bans.channel_id AND cm.user_id = auth.uid())
);
CREATE POLICY "Admins can ban users" ON channel_bans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = channel_bans.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);
CREATE POLICY "Admins can unban" ON channel_bans FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = channel_bans.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

-- 3. Voice participants table
CREATE TABLE IF NOT EXISTS voice_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE voice_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view voice participants" ON voice_participants;
DROP POLICY IF EXISTS "Members can join voice" ON voice_participants;
DROP POLICY IF EXISTS "Members can leave voice" ON voice_participants;

CREATE POLICY "Members can view voice participants" ON voice_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = voice_participants.channel_id AND cm.user_id = auth.uid())
);
CREATE POLICY "Members can join voice" ON voice_participants FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = voice_participants.channel_id AND cm.user_id = auth.uid())
);
CREATE POLICY "Members can leave voice" ON voice_participants FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Members can update own mute" ON voice_participants FOR UPDATE USING (user_id = auth.uid());
