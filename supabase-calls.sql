-- Ticcer - Calls table for LiveKit signaling
-- Run in Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'ongoing', 'ended', 'missed', 'rejected')),
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  room_name TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call participants can view" ON calls;
DROP POLICY IF EXISTS "caller can insert" ON calls;
DROP POLICY IF EXISTS "participants can update" ON calls;

CREATE POLICY "call participants can view" ON calls FOR SELECT
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "caller can insert" ON calls FOR INSERT
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "participants can update" ON calls FOR UPDATE
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE calls;
