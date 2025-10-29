# Vercel Push Notification Configuration

This guide records the push notification credentials used by the dashboard and how to apply them in Vercel. The same keys power on-demand messages and the new 5-minute care reminders (feeding, diaper change, bath time).

## Provided VAPID credentials

```
VAPID_PUBLIC_KEY=BBlLbSe_SjJlSQnW8o_aZy-POYWSaXLxVb9nvqQsjlTnlRVROpteO4KV4QfcmICNewtJwHYClDirrEA3hFMujnw
VAPID_PRIVATE_KEY=kj6IO74-o_4WSvMbh3WkdithcN026OBosGIk4zgrEYM
VAPID_SUBJECT=mailto:noreply@babycare.app
```

Keep the private key secret - set it only in environment variables, never commit it to git.

## 1. Add environment variables in Vercel

1. Open the project in the Vercel dashboard.
2. Navigate to **Settings -> Environment Variables**.
3. Add the following keys in **Production**, **Preview**, and **Development** (three entries per key unless stated otherwise):
   - `VAPID_PUBLIC_KEY` - use the public key above.
   - `VAPID_PRIVATE_KEY` - use the private key above.
   - `VAPID_SUBJECT` - `mailto:noreply@babycare.app`.
   - `SUPABASE_URL` - Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service-role key (needed for the automated 5-minute reminders).
   - `CORS_ALLOWED_ORIGINS` - e.g. `https://babycare.app,https://*.vercel.app` plus local hosts.
4. Redeploy the project so that the values are injected into the Functions runtime.

## 2. Client-side Vite variables

Add the public key to the Vite build so the browser can subscribe:

```
VITE_VAPID_PUBLIC_KEY=BBlLbSe_SjJlSQnW8o_aZy-POYWSaXLxVb9nvqQsjlTnlRVROpteO4KV4QfcmICNewtJwHYClDirrEA3hFMujnw
```

Ways to set it:

- Add it to the Vercel Environment Variables list (same value, same environments).
- Or create a local `.env` file for development with the line above.

## 3. Automated 5-minute reminders

The repository now exposes `api/push/reminders`. Vercel cron calls this endpoint every 5 minutes (see `vercel.json`). Each invocation:

- Rotates through feeding, diaper, and bath reminders.
- Loads push subscriptions from Supabase using the service-role key.
- Sends web-push notifications with the VAPID credentials above.
- Prunes stale subscriptions automatically.

No additional configuration is required beyond the environment variables and redeploy.

## 4. Local testing checklist

1. Create `.env` with all entries from `.env.example`, ensuring the Supabase and VAPID keys are present.
2. Run `npm run dev` and subscribe from the PWA (the browser console logs the subscription payload on success).
3. Trigger notifications:
   - Manual: use the in-app notification sender.
   - Automated: run `npm run push:scheduler` (dry run with `npm run push:scheduler:dry`).

## 5. Troubleshooting

- **`Missing required environment variables` error**: re-check that the keys listed above exist for the current Vercel environment and that the project was redeployed.
- **No notifications received**: verify the browser has an active subscription, the service worker is updated (`Application -> Service Workers` in devtools), and the cron endpoint logs show successful sends (`Vercel -> Functions -> Logs`).
- **Stale subscriptions removed**: expected - the scheduler prunes endpoints that return 404/410. Users should resubscribe from the PWA.

For any changes to the keys, update both Vercel and local `.env` files, then redeploy/restart as appropriate.


