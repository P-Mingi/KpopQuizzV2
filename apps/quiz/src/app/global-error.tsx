'use client';

/**
 * Last-resort error boundary. Fires when a server component throws during
 * RSC rendering - Next replaces the entire document (including the root
 * layout) with this component, so it MUST render its own `<html>` and
 * `<body>` and use inline styles (global CSS isn't guaranteed to be loaded).
 *
 * Without this file, an unhandled throw from a server component becomes a
 * raw Vercel 500 with an empty body. Googlebot retries less aggressively
 * when it sees a real error page with a status and a link home.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#FAF9F6',
          color: '#2C2C2A',
          padding: '20px',
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: '48px', fontWeight: 700, margin: '0 0 8px' }}>
          Oops!
        </h1>
        <p style={{ fontSize: '16px', color: '#888780', margin: '0 0 24px', textAlign: 'center' }}>
          Something went wrong. We&apos;re on it.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              backgroundColor: '#D4537E',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              backgroundColor: '#fff',
              color: '#888780',
              fontSize: '14px',
              border: '1px solid #E8E6E0',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
