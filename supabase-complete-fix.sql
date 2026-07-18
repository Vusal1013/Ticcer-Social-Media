-- ============================================================
-- 1. Follows cədvəli
-- ============================================================
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

-- ============================================================
-- 2. Channel read status (oxunmayan mesajlar üçün)
-- ============================================================
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

-- ============================================================
-- 3. Communities DELETE (owner silə bilər)
-- ============================================================
DROP POLICY IF EXISTS "Owners can delete communities" ON communities;
CREATE POLICY "Owners can delete communities" ON communities FOR DELETE USING (owner_id = auth.uid());

-- ============================================================
-- 4. communities UPDATE (owner və ya admin/mod)
-- ============================================================
DROP POLICY IF EXISTS "Admins can update communities" ON communities;
CREATE POLICY "Admins can update communities" ON communities FOR UPDATE USING (
  owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'mod')
  )
);

-- ============================================================
-- 5. community_members polisləri
-- ============================================================
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
CREATE POLICY "Users can join communities" ON community_members FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can add members" ON community_members;
CREATE POLICY "Admins can add members" ON community_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
CREATE POLICY "Users can leave communities" ON community_members FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can remove members" ON community_members;
CREATE POLICY "Admins can remove members" ON community_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

DROP POLICY IF EXISTS "Admins can update member roles" ON community_members;
CREATE POLICY "Admins can update member roles" ON community_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

-- ============================================================
-- 6. community_channels polisləri (kanal yaratma xətasını DÜZƏLDİR)
-- Owner da yarada bilər (community_members-də olmasa belə)
-- ============================================================
ALTER TABLE community_channels ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

DROP POLICY IF EXISTS "Admins can create channels" ON community_channels;
CREATE POLICY "Admins can create channels" ON community_channels FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM communities WHERE id = community_channels.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_channels.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

DROP POLICY IF EXISTS "Admins can update channels" ON community_channels;
CREATE POLICY "Admins can update channels" ON community_channels FOR UPDATE USING (
  EXISTS (SELECT 1 FROM communities WHERE id = community_channels.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_channels.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

DROP POLICY IF EXISTS "Admins can delete channels" ON community_channels;
CREATE POLICY "Admins can delete channels" ON community_channels FOR DELETE USING (
  community_channels.created_by = auth.uid()
  OR
  EXISTS (SELECT 1 FROM communities WHERE id = community_channels.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_channels.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

-- ============================================================
-- 7. channel_messages DELETE
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete channel messages" ON channel_messages;
CREATE POLICY "Admins can delete channel messages" ON channel_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM community_members cm JOIN community_channels cc ON cc.community_id = cm.community_id WHERE cc.id = channel_messages.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

-- ============================================================
-- 8. community_roles polisləri + icon sütunu (rol yaratma xətasını DÜZƏLDİR)
-- Owner da rol yarada bilər
-- ============================================================
ALTER TABLE community_roles ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'shield-outline';

DROP POLICY IF EXISTS "Admins can manage roles" ON community_roles;
CREATE POLICY "Admins can manage roles" ON community_roles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM communities WHERE id = community_roles.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_roles.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

DROP POLICY IF EXISTS "Admins can update roles" ON community_roles;
CREATE POLICY "Admins can update roles" ON community_roles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM communities WHERE id = community_roles.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_roles.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

DROP POLICY IF EXISTS "Admins can delete roles" ON community_roles;
CREATE POLICY "Admins can delete roles" ON community_roles FOR DELETE USING (
  EXISTS (SELECT 1 FROM communities WHERE id = community_roles.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_roles.community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'mod'))
);

-- ============================================================
-- 9. role_assignments polisləri (rol vermək üçün)
-- Owner da rol verə bilər
-- ============================================================
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view role assignments" ON role_assignments;
CREATE POLICY "Members can view role assignments" ON role_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM communities WHERE id = role_assignments.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members WHERE community_id = role_assignments.community_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can assign roles" ON role_assignments;
CREATE POLICY "Admins can assign roles" ON role_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM communities WHERE id = role_assignments.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members WHERE community_id = role_assignments.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);

DROP POLICY IF EXISTS "Admins can remove role assignments" ON role_assignments;
CREATE POLICY "Admins can remove role assignments" ON role_assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM communities WHERE id = role_assignments.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members WHERE community_id = role_assignments.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);

-- ============================================================
-- 10. Community icons storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('community-icons', 'community-icons', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view community icons" ON storage.objects;
CREATE POLICY "Anyone can view community icons" ON storage.objects FOR SELECT USING (bucket_id = 'community-icons');

DROP POLICY IF EXISTS "Authenticated can upload community icons" ON storage.objects;
CREATE POLICY "Authenticated can upload community icons" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'community-icons' AND auth.role() = 'authenticated');

-- ============================================================
-- 11. Avtomatik rol sistemi: Yeni Üzv → 5 gün → Kidemli Üzv
-- ============================================================

-- Trigger funksiyasi: community_members INSERT olduqda "Yeni Üzv" rolunu avtomatik ver
-- Admin/mod və owner üçün tətbiq edilmir
CREATE OR REPLACE FUNCTION auto_assign_new_member_role()
RETURNS TRIGGER AS $$
DECLARE
  yeni_role_id UUID;
  is_owner BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM communities WHERE id = NEW.community_id AND owner_id = NEW.user_id) INTO is_owner;

  IF NEW.role IN ('admin', 'mod') OR is_owner THEN
    RETURN NEW;
  END IF;

  INSERT INTO community_roles (community_id, name, color, icon, permissions)
  VALUES (NEW.community_id, 'Yeni Üzv', '#4ECDC4', 'star-outline', '{"manage_channels": false, "manage_roles": false, "manage_members": false, "manage_messages": false}')
  ON CONFLICT (community_id, name) DO NOTHING;

  SELECT id INTO yeni_role_id FROM community_roles
  WHERE community_id = NEW.community_id AND name = 'Yeni Üzv';

  INSERT INTO role_assignments (community_id, user_id, role_id)
  VALUES (NEW.community_id, NEW.user_id, yeni_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_assign_new_member_role ON community_members;
CREATE TRIGGER trg_auto_assign_new_member_role
AFTER INSERT ON community_members
FOR EACH ROW
EXECUTE FUNCTION auto_assign_new_member_role();

-- Funksiya: 5 gündən köhnə "Yeni Üzv" rollarını "Kidemli Üzv"ə yüksəlt
CREATE OR REPLACE FUNCTION upgrade_expired_roles(p_community_id UUID DEFAULT NULL)
RETURNS TABLE(affected_user_id UUID, old_role TEXT, new_role TEXT) AS $$
DECLARE
  kidemli_role_id UUID;
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT ra.id AS assignment_id, ra.user_id, ra.community_id, cm.created_at AS joined_at
    FROM role_assignments ra
    JOIN community_roles cr ON cr.id = ra.role_id
    JOIN community_members cm ON cm.community_id = ra.community_id AND cm.user_id = ra.user_id
    WHERE cr.name = 'Yeni Üzv'
      AND (p_community_id IS NULL OR ra.community_id = p_community_id)
      AND cm.created_at < NOW() - INTERVAL '5 days'
  ) LOOP
    INSERT INTO community_roles (community_id, name, color, icon, permissions)
    VALUES (rec.community_id, 'Kidemli Üzv', '#FFD93D', 'sparkles-outline', '{"manage_channels": false, "manage_roles": false, "manage_members": false, "manage_messages": false}')
    ON CONFLICT (community_id, name) DO NOTHING;

    SELECT id INTO kidemli_role_id FROM community_roles
    WHERE community_id = rec.community_id AND name = 'Kidemli Üzv';

    DELETE FROM role_assignments WHERE id = rec.assignment_id;

    INSERT INTO role_assignments (community_id, user_id, role_id)
    VALUES (rec.community_id, rec.user_id, kidemli_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    affected_user_id := rec.user_id;
    old_role := 'Yeni Üzv';
    new_role := 'Kidemli Üzv';
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. Kanal tənzimləmələri: qadağan söz limiti + icma banı
-- ============================================================
ALTER TABLE community_channels ADD COLUMN IF NOT EXISTS banned_word_limit INTEGER DEFAULT 3;
ALTER TABLE community_channels ADD COLUMN IF NOT EXISTS slow_mode_exempt_roles UUID[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS community_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  banned_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

ALTER TABLE community_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view community bans" ON community_bans;
DROP POLICY IF EXISTS "Admins can manage community bans" ON community_bans;
DROP POLICY IF EXISTS "System can insert community bans" ON community_bans;

CREATE POLICY "Members can view community bans" ON community_bans FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members WHERE community_id = community_bans.community_id AND user_id = auth.uid())
);

CREATE POLICY "Admins can manage community bans" ON community_bans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM communities WHERE id = community_bans.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members WHERE community_id = community_bans.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);

CREATE POLICY "Admins can delete community bans" ON community_bans FOR DELETE USING (
  EXISTS (SELECT 1 FROM communities WHERE id = community_bans.community_id AND owner_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM community_members WHERE community_id = community_bans.community_id AND user_id = auth.uid() AND role IN ('admin', 'mod'))
);

-- Trigger: community_members INSERT-da community_bans yoxla
CREATE OR REPLACE FUNCTION check_community_ban()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM community_bans WHERE community_id = NEW.community_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Bu istifadeci topluluqdan banlanmisdir';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_community_ban ON community_members;
CREATE TRIGGER trg_check_community_ban
BEFORE INSERT ON community_members
FOR EACH ROW
EXECUTE FUNCTION check_community_ban();

-- Qadağan söz pozuntu sayı
CREATE TABLE IF NOT EXISTS banned_word_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);
ALTER TABLE banned_word_violations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can manage violations" ON banned_word_violations;
CREATE POLICY "System can manage violations" ON banned_word_violations FOR ALL USING (true) WITH CHECK (true);

-- RPC: pozuntu sayını artır və limit aşılıbsa banla
CREATE OR REPLACE FUNCTION increment_violation(p_community_id UUID, p_user_id UUID, p_limit INTEGER)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  result JSONB;
BEGIN
  INSERT INTO banned_word_violations (community_id, user_id, count)
  VALUES (p_community_id, p_user_id, 1)
  ON CONFLICT (community_id, user_id) DO UPDATE
  SET count = banned_word_violations.count + 1, updated_at = NOW()
  RETURNING count INTO current_count;

  IF current_count >= p_limit THEN
    INSERT INTO community_bans (community_id, user_id, reason, banned_by)
    VALUES (p_community_id, p_user_id, 'Qadağan sözlərdən təkrar istifadə', p_user_id)
    ON CONFLICT (community_id, user_id) DO NOTHING;

    DELETE FROM community_members
    WHERE community_id = p_community_id AND user_id = p_user_id;

    result := jsonb_build_object('banned', true, 'count', current_count);
  ELSE
    result := jsonb_build_object('banned', false, 'count', current_count);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
