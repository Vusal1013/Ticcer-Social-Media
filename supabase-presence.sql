-- Online/offline presence & message status tracking
-- Run this in Supabase SQL Editor

-- Add presence columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Add delivery & read tracking to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Add read tracking to channel_messages
ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- RLS: allow conversation participants to update messages (needed for delivered_at / read_at)
CREATE POLICY "Participants can update messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- RLS: allow channel members to update channel_messages (needed for read_at)
CREATE POLICY "Channel members can update messages"
  ON channel_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      JOIN community_channels cc ON cc.community_id = cm.community_id
      WHERE cc.id = channel_messages.channel_id AND cm.user_id = auth.uid()
    )
  );

-- Note: profiles already has "Users can update own profile" policy from main migration

-- Add DELETE policy for notifications (missing from main migration)
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Extend comment delete policy: post owner can delete any comment
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;
CREATE POLICY "Users can delete own comments" ON post_comments FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM posts WHERE id = post_comments.post_id AND user_id = auth.uid())
);
