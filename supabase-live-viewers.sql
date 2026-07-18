-- Live viewer count + viewer list support
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. viewer_count sütunu ekle
ALTER TABLE lives ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0;

-- 2. live_viewers tablosu
CREATE TABLE IF NOT EXISTS live_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(live_id, user_id)
);

ALTER TABLE live_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live viewers" ON live_viewers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join live" ON live_viewers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can leave live" ON live_viewers FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE live_viewers;

-- 3. Atomic increment fonksiyonu
CREATE OR REPLACE FUNCTION increment_live_viewers(live_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE lives SET viewer_count = viewer_count + 1 WHERE id = live_id AND status = 'live';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atomic decrement fonksiyonu
CREATE OR REPLACE FUNCTION decrement_live_viewers(live_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE lives SET viewer_count = GREATEST(viewer_count - 1, 0) WHERE id = live_id AND status = 'live';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Yayın bittiğinde sayaçları sıfırla
UPDATE lives SET viewer_count = 0 WHERE status = 'ended';
