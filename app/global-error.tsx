"use client";

/** Last-resort error screen (replaces the root layout, so it brings its own <html>). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ background: "#F6EEE7", color: "#1F1A17", fontFamily: "Georgia, serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center" }}>
        <div>
          <p style={{ fontSize: 40, margin: 0 }}>seicase</p>
          <h1 style={{ fontWeight: 400, fontSize: 34 }}>We&apos;ll be right back</h1>
          <p style={{ fontFamily: "Arial, sans-serif", color: "#6F6158" }}>Something unexpected happened. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 16, background: "#1F1A17", color: "#F6EEE7", border: 0, borderRadius: 6, padding: "14px 24px", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
