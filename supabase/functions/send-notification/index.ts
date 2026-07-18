import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendViaExpo(userIds: string[], title: string, body: string, data: Record<string, unknown> = {}) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .in('id', userIds)
    .not('expo_push_token', 'is', null);

  if (!profiles?.length) return;

      const messages = profiles
    .filter((p: any) => p.expo_push_token)
    .map((p: any) => ({
      to: p.expo_push_token,
      sound: 'default',
      title,
      body,
      data,
      channelId: data?.type === 'call' ? 'calls' : 'general',
      priority: data?.type === 'call' ? 'high' : 'normal',
      ...(data?.type === 'call' ? { _displayInForeground: true } : {}),
    }));

  console.log(`Profiles with tokens: ${profiles.length}, messages: ${messages.length}`);

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  const result = await res.json();
  console.log('Expo push response:', JSON.stringify(result));

  if (result?.data) {
    for (const ticket of result.data) {
      if (ticket.status === 'error') {
        console.error('Expo push ticket error:', JSON.stringify(ticket));
      }
    }
  }

  return result;
}

serve(async (req) => {
  try {
    const payload = await req.json();

    // Support both direct API calls and Supabase webhook format
    const userIds = payload.userIds || (payload.type === 'INSERT' && payload.record ? [payload.record.user_id] : []);
    let title = payload.title || 'Ticcer';
    let body = payload.body || 'Yeni bildiriş';
    let data = payload.data || payload.record?.data || {};

    // Handle call notifications from calls table webhook
    if (payload.type === 'INSERT' && payload.table === 'calls' && payload.record) {
      const rec = payload.record;
      const { data: caller } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', rec.caller_id)
        .single();

      const callerName = (caller as any)?.full_name || 'Kimdir';
      title = rec.call_type === 'video' ? '📹 Video zəng' : '📞 Səsli zəng';
      body = `${callerName} sizə zəng edir`;
      data = {
        type: 'call',
        call_id: rec.id,
        caller_id: rec.caller_id,
        room_name: rec.room_name,
        conversation_id: rec.conversation_id,
        call_type: rec.call_type,
        route: `ticcer://call/${rec.id}`,
      };
      // For calls, send to callee directly regardless of preference settings
      const { data: callee } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', rec.callee_id)
        .single();

      if ((callee as any)?.expo_push_token) {
        await sendViaExpo([rec.callee_id], title, body, data);
      }
      return new Response(JSON.stringify({ ok: true }));
    }

    if (!userIds?.length) {
      return new Response(JSON.stringify({ error: 'No recipients' }), { status: 400 });
    }

    // Check notification preferences for each user
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, likes, comments, follows, mentions')
      .in('user_id', userIds);

    const type = payload.notificationType || payload.record?.type;
    const prefMap = new Map((prefs || []).map((p: any) => [p.user_id, p]));

    const filteredUserIds = userIds.filter((uid: string) => {
      const pref = prefMap.get(uid);
      if (!pref) return true;
      if (type === 'like' && !pref.likes) return false;
      if (type === 'comment' && !pref.comments) return false;
      if (type === 'follow' && !pref.follows) return false;
      if (type === 'mention' && !pref.mentions) return false;
      if (type === 'message' && !pref.messages) return false;
      return true;
    });

    if (!filteredUserIds.length) {
      return new Response(JSON.stringify({ ok: true, skipped: true }));
    }

    const result = await sendViaExpo(filteredUserIds, title, body, data);
    return new Response(JSON.stringify(result || { ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
