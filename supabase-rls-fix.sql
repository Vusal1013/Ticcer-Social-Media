-- Community RLS Policy Fix
-- Ensures only community owner or community members with admin/mod role can manage
-- Global site admins (profile.role = 'admin') have NO special access to community tables

-- ===== 1. COMMUNITIES =====
-- Owner or admin/mod can update community settings
DROP POLICY IF EXISTS "Admins can update communities" ON communities;
CREATE POLICY "Admins can update communities" ON communities FOR UPDATE USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- Only owner can delete community (already added in supabase-read-status.sql)

-- ===== 2. COMMUNITY_MEMBERS =====
-- Users can join public communities (insert themselves)
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
CREATE POLICY "Users can join communities" ON community_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Admins/mods can add members (approve requests)
DROP POLICY IF EXISTS "Admins can add members" ON community_members;
CREATE POLICY "Admins can add members" ON community_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- Users can leave (delete themselves)
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
CREATE POLICY "Users can leave communities" ON community_members FOR DELETE USING (user_id = auth.uid());

-- Admins/mods can remove members
DROP POLICY IF EXISTS "Admins can remove members" ON community_members;
CREATE POLICY "Admins can remove members" ON community_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- Admins/mods can update member roles
DROP POLICY IF EXISTS "Admins can update member roles" ON community_members;
CREATE POLICY "Admins can update member roles" ON community_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- ===== 3. COMMUNITY_CHANNELS =====
-- Owner or admin/mod can create channels
DROP POLICY IF EXISTS "Admins can create channels" ON community_channels;
CREATE POLICY "Admins can create channels" ON community_channels FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_channels.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- Owner or admin/mod can update channels
DROP POLICY IF EXISTS "Admins can update channels" ON community_channels;
CREATE POLICY "Admins can update channels" ON community_channels FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_channels.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- Owner or admin/mod can delete channels
DROP POLICY IF EXISTS "Admins can delete channels" ON community_channels;
CREATE POLICY "Admins can delete channels" ON community_channels FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_channels.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- ===== 4. CHANNEL_MESSAGES =====
-- Owner or admin/mod can delete messages
DROP POLICY IF EXISTS "Admins can delete channel messages" ON channel_messages;
CREATE POLICY "Admins can delete channel messages" ON channel_messages FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    JOIN community_channels cc ON cc.community_id = cm.community_id
    WHERE cc.id = channel_messages.channel_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- ===== 5. ENSURING GLOBAL ADMINS HAVE NO POWER =====
-- This is already the case since no policy references profiles.role = 'admin'
-- But let's make sure by removing any policy that might accidentally grant access
-- (There are none currently, but this serves as documentation)
-- Global admins only have power over: reports, gold_requests, notifications, profiles
-- They do NOT have any access to community tables beyond what regular users have

-- ===== 6. COMMUNITY_ROLES =====
-- Add icon column if it doesn't exist
ALTER TABLE community_roles ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'shield-outline';

-- Admins/mods can create roles
DROP POLICY IF EXISTS "Admins can manage roles" ON community_roles;
CREATE POLICY "Admins can manage roles" ON community_roles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_roles.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- Admins/mods can update roles
DROP POLICY IF EXISTS "Admins can update roles" ON community_roles;
CREATE POLICY "Admins can update roles" ON community_roles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_roles.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- Admins/mods can delete roles
DROP POLICY IF EXISTS "Admins can delete roles" ON community_roles;
CREATE POLICY "Admins can delete roles" ON community_roles FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_roles.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);
