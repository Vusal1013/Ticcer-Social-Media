import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY')!;
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createLiveKitToken(identity: string, roomName: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    iss: LIVEKIT_API_KEY,
    sub: identity,
    exp: now + 600,
    iat: now,
    nbf: now,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    },
  }));

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(LIVEKIT_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`));
  const sigStr = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${header}.${payload}.${sigStr}`;
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { roomName, canPublish } = await req.json();
    if (!roomName) {
      return new Response(JSON.stringify({ error: 'roomName required' }), { status: 400 });
    }

    const canPublishBool = canPublish !== false;
    const payload = {
      iss: LIVEKIT_API_KEY,
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 600,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: canPublishBool,
        canSubscribe: true,
      },
    };
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadEnc = base64UrlEncode(JSON.stringify(payload));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(LIVEKIT_API_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payloadEnc}`));
    const jwt = `${header}.${payloadEnc}.${base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))}`;
    return new Response(JSON.stringify({ token: jwt }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
