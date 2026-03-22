# InstaSupply Push Tester (Next.js)

A tiny one-screen web app to create a delivery in the Insta Supplies Firebase project. Creating a new `deliveries` doc triggers the existing Cloud Function push flow (`notifyDriverOnNewDelivery`).

## 1. Configure environment

Copy `.env.example` to `.env.local` and fill values from **Insta Supplies Firebase service account**:

```bash
cp .env.example .env.local
```

Required vars:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (keep escaped newlines like `\\n` in env file)

Optional:

- `PUSH_TESTER_API_KEY` (recommended for deployed environments)

## 2. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 3. Test push flow

1. On mobile app Deliveries screen, tap `Show Push Token` and copy token.
2. Paste driver push token in web app.
3. Click `Send Test Delivery Push`.
4. App creates a new `deliveries` document with `driverFcmToken`.
5. Existing Cloud Function should send push using provided token.

If `PUSH_TESTER_API_KEY` is set, enter the same value in the web app `API Key` field.

Location behavior:

- Uses fixed Abohar test coordinates.

## 4. Deploy to Vercel

1. Import `push-tester-web` as a project in Vercel.
2. Set root directory to `push-tester-web`.
3. Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
4. Optionally add `PUSH_TESTER_API_KEY`.
5. Deploy.

## Notes

- This app writes from server-side Firebase Admin SDK, so client Firestore rules are not required.
- This tool is intended for temporary internal testing only.
