# InstaSupply Push Tester (Next.js)

## Setup

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Add these values in `.env.local`:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (keep escaped newlines like `\\n`)
- `PUSH_TESTER_API_KEY`

3. Install and run:

```bash
npm install
npm run dev
```

## Trigger a test notification

1. Open the website: [https://instasupplydriverapp.vercel.app/](https://instasupplydriverapp.vercel.app/)
2. In the mobile app Deliveries screen, tap `Show Push Token` and copy the token.
3. Paste token into `Driver Push Token` on the website.
4. Enter API Key: `insta-push-test`
5. Click `Send Test Delivery Push`.

This creates a test `deliveries` document and triggers the existing push notification flow.
