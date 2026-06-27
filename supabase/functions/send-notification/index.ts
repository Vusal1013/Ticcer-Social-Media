import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const ONE_SIGNAL_APP_ID = Deno.env.get('ONE_SIGNAL_APP_ID')!;
const ONE_SIGNAL_API_KEY = Deno.env.get('ONE_SIGNAL_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendToOneSignal(userIds: string[], title: string, body: string, data: Record<string, unknown> = {}) {
  const payload = {
    app_id: ONE_SIGNAL_APP_ID,
    include_aliases: { user_id: userIds },
    target_channel: 'push',
    headings: { en: title },
    contents: { en: body },
    data,
  };

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${ONE_SIGNAL_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  return await res.json();
}

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
    }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  return await res.json();
}

serve(async (req) => {
  try {
    const payload = await req.json();

    // Support both direct API calls and Supabase webhook format
    const userIds = payload.userIds || (payload.type === 'INSERT' && payload.record ? [payload.record.user_id] : []);
    const title = payload.title || 'Ticcer';
    const body = payload.body || 'Yeni bildiriş';
    const data = payload.data || payload.record || {};

    if (!userIds?.length) {
      return new Response(JSON.stringify({ error: 'No recipients' }), { status: 400 });
    }

    // Check notification preferences for each user
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, likes, comments, follows, mentions')
      .in('user_id', userIds);

    const type = payload.type === 'INSERT' ? payload.table?.replace('post_', '') : payload.notificationType;
    const prefMap = new Map((prefs || []).map((p: any) => [p.user_id, p]));

    const filteredUserIds = userIds.filter((uid: string) => {
      const pref = prefMap.get(uid);
      if (!pref) return true;
      if (type === 'like' && !pref.likes) return false;
      if (type === 'comment' && !pref.comments) return false;
      if (type === 'follow' && !pref.follows) return false;
      if (type === 'mention' && !pref.mentions) return false;
      return true;
    });

    if (!filteredUserIds.length) {
      return new Response(JSON.stringify({ ok: true, skipped: true }));
    }

    // Try OneSignal first, fallback to Expo
    if (ONE_SIGNAL_APP_ID && ONE_SIGNAL_API_KEY) {
      const result = await sendToOneSignal(filteredUserIds, title, body, data);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await sendViaExpo(filteredUserIds, title, body, data);
    return new Response(JSON.stringify(result || { ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
