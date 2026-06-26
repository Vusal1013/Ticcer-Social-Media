import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ONE_SIGNAL_APP_ID = Deno.env.get('ONE_SIGNAL_APP_ID')!;
const ONE_SIGNAL_API_KEY = Deno.env.get('ONE_SIGNAL_API_KEY')!;

serve(async (req) => {
  try {
    const { userIds, title, body, data } = await req.json();

    if (!userIds?.length || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const payload = {
      app_id: ONE_SIGNAL_APP_ID,
      include_aliases: {
        user_id: userIds,
      },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: data || {},
      small_icon: 'ic_stat_onesignal_default',
      large_icon: 'https://wibtcbushwojjzegyppl.supabase.co/storage/v1/object/public/avatars/app-icon.png',
    };

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${ONE_SIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
