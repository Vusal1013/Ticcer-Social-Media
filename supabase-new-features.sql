-- ============================================================
-- TICCRMEDIA - YENI XÜSUSİYYƏTLƏR SQL MİQRASİYASI
-- 8 yeni funksiya üçün bütün SQL əmrləri
-- ============================================================

-- ============================================================
-- 6. GİİZLİ PROFİL (CLOSE FRIENDS)
-- ============================================================

-- Close friends cədvəli
CREATE TABLE IF NOT EXISTS close_friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_close_friends_user ON close_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_close_friends_friend ON close_friends(friend_id);

-- RLS
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own close friends"
  ON close_friends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add close friends"
  ON close_friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove close friends"
  ON close_friends FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 7. POST PLANLAŞDIRMA (SCHEDULED POSTS)
-- ============================================================

-- posts cədvəlinə yeni sütunlar əlavə et
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'everyone' CHECK (visibility IN ('everyone', 'close_friends'));
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published', 'cancelled'));

-- Planlaşdırılmış postları avtomatik yayımlayan funksiya
CREATE OR REPLACE FUNCTION publish_scheduled_posts()
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET status = 'published'
  WHERE status = 'pending'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= now();
END;
$$ LANGUAGE plpgsql;

-- Bu funksiyanı pg_cron ilə hər dəqiqə çağırmaq olar:
-- SELECT cron.schedule('publish-scheduled-posts', '* * * * *', 'SELECT publish_scheduled_posts()');


-- ============================================================
-- 8. EMOJİ REAKSİYALARI (COMMENT REACTIONS)
-- ============================================================

-- Şərh reaksiyaları cədvəli
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL CHECK (length(emoji) <= 8),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(comment_id, user_id, emoji)
);

-- Indexlər
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user ON comment_reactions(user_id);

-- RLS
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment reactions"
  ON comment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can react to comments"
  ON comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON comment_reactions FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 9. GÖRÜNÜŞ TARİXÇƏSİ (PROFILE VIEWS)
-- ============================================================

-- Profil görüntüləri cədvəli
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (viewer_id != profile_id)
);

-- Indexlər
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created ON profile_views(created_at DESC);

-- RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile views"
  ON profile_views FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Authenticated users can record profile views"
  ON profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);


-- ============================================================
-- 12. REDAKTƏ OLUNMUŞ MESAJLAR (EDIT/DELETE MESSAGES)
-- ============================================================

-- messages cədvəlinə yeni sütunlar əlavə et
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;


-- ============================================================
-- 15. TEMATİK PROFİLLƏR (THEME PROFILES)
-- ============================================================

-- Profil mövzu cədvəli
CREATE TABLE IF NOT EXISTS profile_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#6C63FF',
  secondary_color TEXT NOT NULL DEFAULT '#FF6584',
  background_gradient JSONB DEFAULT '["#0F0F23", "#1A1A3E"]',
  card_color TEXT NOT NULL DEFAULT '#252550',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- profiles cədvəlinə theme_id sütunu əlavə et
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES profile_themes(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE profile_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view themes"
  ON profile_themes FOR SELECT
  USING (true);

-- Default tema əlavə et
INSERT INTO profile_themes (name, primary_color, secondary_color, background_gradient, card_color) VALUES
  ('Standart', '#6C63FF', '#FF6584', '["#0F0F23", "#1A1A3E"]', '#252550'),
  ('Okean', '#0891B2', '#06B6D4', '["#0C1222", "#0E2A47"]', '#163A5F'),
  ('Meşə', '#059669', '#10B981', '["#0A1F15", "#0F2E1F"]', '#1A3D2C'),
  ('Günbatımı', '#F59E0B', '#EF4444', '["#1C1007", "#2D1A0A"]', '#3D2510'),
  ('Lavanda', '#A855F7', '#C084FC', '["#150A2A", "#200F3D"]', '#2D1850'),
  ('Gül', '#EC4899', '#F472B6', '["#1F0A15", "#2D1020"]', '#3D1830'),
  ('Arktika', '#38BDF8', '#7DD3FC', '["#0A1628", "#0E2240"]', '#163050'),
  ('Od', '#EF4444', '#F97316', '["#1A0808", "#2D1010"]', '#3D1818'),
  ('Neon', '#22D3EE', '#A3E635', '["#050A0F", "#0A1414"]', '#0F1E1E'),
  ('Gecə Yarısı', '#818CF8', '#6366F1', '["#08081A", "#0F0F30"]', '#181845')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 21. ÇOXdİLLİ DƏSTƏK (MULTI-LANGUAGE)
-- ============================================================

-- profiles cədvəlinə dil sütunu əlavə et
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('az', 'en', 'ru', 'zh', 'es', 'hi', 'ar', 'pt', 'fr', 'de', 'ja', 'ko', 'tr'));


-- ============================================================
-- 18. AI ŞƏRH KÖMƏKÇİSİ - EDGE FUNCTION
-- ============================================================

-- Edge Function: supabase/functions/ai-comment-suggestions/index.ts
-- Bu funksiya artıq yaradılıb (yuxarıdakı faylda).
-- Heç əlavə SQL lazım deyil.


-- ============================================================
-- TRIGGER'LAR VƏ FUNKSİYALAR
-- ============================================================

-- Yeni istifadəçi yaradılanda default dil və theme təyin et
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, language, theme_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'İstifadəçi'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
    (SELECT id FROM profile_themes WHERE name = 'Standart' LIMIT 1)
  )
  ON CONFLICT (id) DO UPDATE SET
    language = COALESCE(EXCLUDED.language, profiles.language),
    theme_id = COALESCE(EXCLUDED.theme_id, profiles.theme_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- RLS DÜZƏLİŞLƏRİ
-- ============================================================

-- posts cədvəli üçün visibility filter
-- Close friends-only postları yalnız yaxın dostlar görə bilər
CREATE POLICY "Users can view everyone posts"
  ON posts FOR SELECT
  USING (
    visibility = 'everyone'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM close_friends cf
      WHERE cf.user_id = posts.user_id
        AND cf.friend_id = auth.uid()
    )
  );

-- profil_images storage bucket-i əlavə et (əgər yoxdursa)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-themes', 'profile-themes', true)
-- ON CONFLICT DO NOTHING;


-- ============================================================
-- VIEWS (GÖRÜNÜŞLƏR)
-- ============================================================

-- Son 7 gündə profil görüntüləri
CREATE OR REPLACE VIEW recent_profile_views AS
SELECT
  pv.profile_id,
  COUNT(*) as view_count,
  COUNT(DISTINCT pv.viewer_id) as unique_viewers
FROM profile_views pv
WHERE pv.created_at >= now() - INTERVAL '7 days'
GROUP BY pv.profile_id;


-- ============================================================
-- ÜMUMİ DƏYİŞİKLİKLƏR XÜLASƏSİ
-- ============================================================

-- Yeni cədvəllər: close_friends, comment_reactions, profile_views, profile_themes
-- Yeni sütunlar: posts.visibility, posts.scheduled_at, posts.status,
--   messages.edited_at, messages.deleted_at, profiles.theme_id, profiles.language
-- Yeni funksiyalar: publish_scheduled_posts(), handle_new_user() (yenilənmiş)
-- Yeni view: recent_profile_views
-- Storage bucket-lər: avatar, post-images, reels, stories, voice-messages,
--   community-audio, lives, gold-requests, community-icons, community-covers
