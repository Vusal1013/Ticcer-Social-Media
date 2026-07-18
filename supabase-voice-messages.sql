-- Ticcer - Voice Messages Migration
-- Run this in Supabase Dashboard -> SQL Editor. Safe to run multiple times.

-- 1. ADD COLUMNS TO EXISTING TABLES
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration REAL;

ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS voice_duration REAL;

-- 2. VOICE MESSAGES STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own voice messages" ON storage.objects;

CREATE POLICY "Anyone can view voice messages" ON storage.objects FOR SELECT USING (bucket_id = 'voice-messages');
CREATE POLICY "Users can upload voice messages" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'voice-messages' AND auth.role() = 'authenticated'
);
CREATE POLICY "Users can delete own voice messages" ON storage.objects FOR DELETE USING (
  bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. UPDATE NOTIFICATION TRIGGER TO HANDLE VOICE MESSAGES
CREATE OR REPLACE FUNCTION notify_message()
RETURNS TRIGGER AS $$
DECLARE
  msg_body TEXT;
BEGIN
  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    msg_body := LEFT(NEW.content, 50);
  ELSIF NEW.audio_url IS NOT NULL THEN
    msg_body := '🎤 Sesli mesaj';
  ELSE
    msg_body := 'Mesaj';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT cp.user_id, 'message', (SELECT full_name FROM profiles WHERE id = NEW.sender_id),
    msg_body,
    jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id, 'route', 'ticcer://message/' || NEW.conversation_id)
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id != NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ENABLE RLS ON NEW COLUMNS (table already has RLS enabled, existing policies cover the new columns)
