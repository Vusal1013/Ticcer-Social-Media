-- Follows table (if not exists)
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view follows" ON follows;
DROP POLICY IF EXISTS "Users can follow" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

CREATE POLICY "Users can view follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (follower_id = auth.uid());
