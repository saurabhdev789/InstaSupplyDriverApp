'use client';

import {FormEvent, useMemo, useState} from 'react';

const REQUEST_TIMEOUT_MS = 15000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          'Request timed out. Check internet, server env vars, and Vercel function logs.',
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

export default function HomePage() {
  const [pushToken, setPushToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const trimmedPushToken = useMemo(() => pushToken.trim(), [pushToken]);

  const sendTestDelivery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!trimmedPushToken) {
      setError('Driver push token is required.');
      return;
    }

    setBusy(true);

    try {
      const created = await withTimeout(
        fetch('/api/send-test-delivery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey.trim() ? {'x-api-key': apiKey.trim()} : {}),
          },
          body: JSON.stringify({pushToken: trimmedPushToken}),
        }),
      );

      const json = (await created.json()) as {
        id?: string;
        orderId?: string;
        error?: string;
        assignedDriverIdResolved?: boolean;
      };
      if (!created.ok) {
        throw new Error(json.error ?? 'Failed to create delivery.');
      }

      setStatus(
        `Delivery ${json.orderId} created (${json.id}). assignedDriverId resolved: ${
          json.assignedDriverIdResolved ? 'yes' : 'no'
        }.`,
      );
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to create delivery.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <section className="card">
        <h1>InstaSupply Push Tester</h1>
        <p>
          This creates a <code>deliveries</code> document in the Insta Supplies Firebase project to
          trigger <code>notifyDriverOnNewDelivery</code>.
        </p>

        <form onSubmit={sendTestDelivery}>
          <label htmlFor="driverPushToken">Driver Push Token</label>
          <input
            id="driverPushToken"
            type="text"
            value={pushToken}
            onChange={event => setPushToken(event.target.value)}
            placeholder="Paste FCM token from mobile app"
            autoComplete="off"
          />
          <label htmlFor="apiKey">API Key (optional)</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder="Required only if PUSH_TESTER_API_KEY is set"
            autoComplete="off"
          />
          <button type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send Test Delivery Push'}
          </button>
        </form>

        {status ? <p className="status ok">{status}</p> : null}
        {error ? <p className="status err">{error}</p> : null}
      </section>
    </main>
  );
}
