"use client";

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
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <h1 style={{ color: "#22d3ee", fontSize: "24px", marginBottom: "8px" }}>⚡ AKMIND Admin</h1>
        <p style={{ color: "#475569", fontSize: "13px", marginBottom: "32px" }}>
          Dev panel for testing games
        </p>

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
                href={`/demo/lesson/2?token=${q}`}
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
                Game 2 Direct
              </a>
              <a
                href={`/demo/lesson/3?token=${q}`}
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
                Game 3 Direct
              </a>
              <a
                href={`/demo/lesson/4?token=${q}`}
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
                Game 4 Direct
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
  );
}
