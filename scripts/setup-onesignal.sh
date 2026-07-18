#!/bin/bash
# OneSignal environment variables for Supabase Edge Functions
# Run: bash scripts/setup-onesignal.sh

echo "Setting OneSignal secrets for Supabase Edge Functions..."
npx supabase secrets set ONE_SIGNAL_APP_ID=your_onesignal_app_id
npx supabase secrets set ONE_SIGNAL_API_KEY=your_onesignal_api_key
echo "Done! Edge functions can now use Deno.env.get('ONE_SIGNAL_APP_ID') and Deno.env.get('ONE_SIGNAL_API_KEY')"
