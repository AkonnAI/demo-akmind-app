"use client";

export default function GlobalError({
  error: _error,
  reset,
}: {
  readonly error: Error;
  reset: () => void;
}) {
  void _error;
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "24px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "400px",
        }}
      >
        <div style={{ fontSize: "48px" }}>⚠️</div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            marginTop: "16px",
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            color: "#64748b",
            marginTop: "8px",
            fontSize: "14px",
          }}
        >
          We had a technical issue. Your progress is saved.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "24px",
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "12px 24px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Try Again
        </button>
        <a
          href="/demo"
          style={{
            display: "block",
            marginTop: "12px",
            color: "#6366f1",
            fontSize: "14px",
          }}
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
