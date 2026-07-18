-- Channel read status for unread indicators
CREATE TABLE IF NOT EXISTS channel_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE channel_read_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own read status" ON channel_read_status;
DROP POLICY IF EXISTS "Users can upsert own read status" ON channel_read_status;
DROP POLICY IF EXISTS "Users can update own read status" ON channel_read_status;

CREATE POLICY "Users can view own read status" ON channel_read_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own read status" ON channel_read_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own read status" ON channel_read_status FOR UPDATE USING (auth.uid() = user_id);

-- Add DELETE policy for communities (owners can delete their own)
DROP POLICY IF EXISTS "Owners can delete communities" ON communities;
CREATE POLICY "Owners can delete communities" ON communities FOR DELETE USING (owner_id = auth.uid());
