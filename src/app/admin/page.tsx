"use client";

import DemoCompleteCelebration from "@/components/demo/DemoCompleteCelebration";
import { DEMO_COMPLETE_PREVIEW_USER } from "@/lib/demo-complete-preview-user";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "changeme";
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin_authed") === "1") {
      setAuthed(true);
    }
  }, []);

  const doLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setAuthError("");
      sessionStorage.setItem("admin_authed", "1");
      return;
    }
    setAuthError("Invalid admin password");
  };

  const getToken = async () => {
    const res = await fetch("/api/demo/admin");
    const data = (await res.json()) as { token?: string; error?: string };
    if (data.token) setToken(data.token);
  };

  const resetProgress = async () => {
    await fetch("/api/demo/admin", { method: "DELETE" });
    setMessage("Progress reset! You can replay.");
    setTimeout(() => setMessage(""), 3000);
  };

  const q = token ? encodeURIComponent(token) : "";

  if (!authed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050510",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            background: "#0f0f23",
            border: "1px solid #6366f1",
            borderRadius: "16px",
            padding: "40px",
            maxWidth: "420px",
            width: "100%",
          }}
        >
          <h1 style={{ color: "#22d3ee", fontSize: "24px", marginBottom: "16px" }}>AKMIND Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            style={{
              width: "100%",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#020617",
              color: "white",
              padding: "10px 12px",
              marginBottom: "12px",
            }}
          />
          <button
            type="button"
            onClick={doLogin}
            style={{
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "12px 24px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              width: "100%",
            }}
          >
            Login
          </button>
          {authError ? (
            <p style={{ color: "#f87171", marginTop: "10px", fontSize: "12px" }}>{authError}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050510",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
        }}
      >
        <div
          style={{
            background: "#0f0f23",
            border: "1px solid #6366f1",
            borderRadius: "16px",
            padding: "40px",
            maxWidth: "500px",
            width: "100%",
          }}
        >
        <h1 style={{ color: "#22d3ee", fontSize: "24px", marginBottom: "8px" }}>⚡ AKMIND Admin</h1>
        <p style={{ color: "#475569", fontSize: "13px", marginBottom: "16px" }}>
          Dev panel for testing games. Scroll down for the full completion preview.
        </p>

        <a
          href="#admin-completion-preview"
          style={{
            display: "block",
            background: "#0ea5e9",
            color: "#0f172a",
            borderRadius: "10px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "bold",
            width: "100%",
            marginBottom: "12px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Jump to completion preview (certificate + animation) ↓
        </a>

        <button
          type="button"
          onClick={() => void getToken()}
          style={{
            background: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "12px 24px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            width: "100%",
            marginBottom: "12px",
          }}
        >
          Get Admin Token
        </button>

        <a
          href="/demo/complete-preview"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            background: "#312e81",
            color: "#e0e7ff",
            borderRadius: "10px",
            padding: "10px 24px",
            fontSize: "13px",
            fontWeight: "600",
            width: "100%",
            marginBottom: "12px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Same preview in a new tab →
        </a>

        {token ? (
          <div
            style={{
              background: "#1e1b4b",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <p style={{ color: "#a5b4fc", fontSize: "12px", marginBottom: "8px" }}>Your token:</p>
            <code style={{ color: "#22d3ee", fontSize: "14px", wordBreak: "break-all" }}>{token}</code>
            <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <a
                href={`/?token=${q}`}
                style={{
                  background: "#059669",
                  color: "white",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                Open Demo →
              </a>
              <a
                href={`/demo/lesson/1?token=${q}`}
                style={{
                  background: "#b45309",
                  color: "white",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                Game 1 Direct
              </a>
              <a
                href={`/demo/lesson/2?token=${q}`}
                style={{
                  background: "#7c3aed",
                  color: "white",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                Game 2 Direct
              </a>
              <a
                href={`/demo/lesson/3?token=${q}`}
                style={{
                  background: "#991b1b",
                  color: "white",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                Game 3 Direct
              </a>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void resetProgress()}
          style={{
            background: "transparent",
            color: "#ef4444",
            border: "1px solid #ef4444",
            borderRadius: "10px",
            padding: "12px 24px",
            cursor: "pointer",
            fontSize: "14px",
            width: "100%",
          }}
        >
          Reset Admin Progress (replay games)
        </button>

        {message ? (
          <p style={{ color: "#22c55e", textAlign: "center", marginTop: "12px", fontSize: "13px" }}>
            {message}
          </p>
        ) : null}

        <p style={{ color: "#334155", fontSize: "11px", marginTop: "24px", textAlign: "center" }}>
          Only accessible in development. Remove before production.
        </p>
        </div>
      </div>

      <div
        id="admin-completion-preview"
        style={{
          scrollMarginTop: "16px",
          borderTop: "2px solid rgba(129,140,248,0.45)",
          paddingTop: "28px",
          paddingBottom: "56px",
          background:
            "linear-gradient(180deg, rgba(18,18,35,0.98) 0%, rgba(8,8,16,1) 35%, #050510 100%)",
        }}
      >
        <p
          style={{
            color: "#cbd5e1",
            textAlign: "center",
            fontSize: "14px",
            padding: "8px 20px 20px",
            maxWidth: "640px",
            margin: "0 auto",
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: "#e2e8f0" }}>Completion experience</strong> — confetti, stats,
          badges, certificate mock-up, PDF button, and the{" "}
          <strong style={{ color: "#67e8f9" }}>Launching June 2026</strong> card (admin-only; not
          shown to learners).
        </p>
        <DemoCompleteCelebration
          user={DEMO_COMPLETE_PREVIEW_USER}
          isPreview
          showLaunchJuneCard
        />
      </div>
    </div>
  );
}
