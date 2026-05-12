"use client";

import DemoCompleteCelebration from "@/components/demo/DemoCompleteCelebration";
import { DEMO_COMPLETE_PREVIEW_USER } from "@/lib/demo-complete-preview-user";
import type { DemoUser } from "@/types/demo";
import { useCallback, useEffect, useState } from "react";

type DemoProgram = "AI Explorers" | "AI Builders";

export default function AdminPage() {
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "changeme";
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [adminCourse, setAdminCourse] = useState<DemoUser["course"] | null>(null);
  const [courseSaving, setCourseSaving] = useState(false);

  const resolvedProgram: DemoProgram =
    adminCourse === "AI Builders" ? "AI Builders" : "AI Explorers";

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin_authed") === "1") {
      setAuthed(true);
    }
  }, []);

  const loadAdmin = useCallback(async () => {
    const res = await fetch("/api/demo/admin");
    const data = (await res.json()) as {
      token?: string;
      course?: DemoUser["course"];
      error?: string;
    };
    if (data.token) setToken(data.token);
    if (data.course === "AI Explorers" || data.course === "AI Builders" || data.course === "AI Innovators") {
      setAdminCourse(data.course);
    } else {
      setAdminCourse("AI Explorers");
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    void loadAdmin();
  }, [authed, loadAdmin]);

  const doLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setAuthError("");
      sessionStorage.setItem("admin_authed", "1");
      return;
    }
    setAuthError("Invalid admin password");
  };

  const setProgram = async (next: DemoProgram) => {
    setCourseSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/demo/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: next }),
      });
      const data = (await res.json()) as { course?: DemoProgram; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update program");
      setAdminCourse(data.course ?? next);
      setMessage(`Program saved: ${data.course ?? next}. Use Open Demo or your token — lessons match this track.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update program");
    } finally {
      setCourseSaving(false);
      setTimeout(() => setMessage(""), 5000);
    }
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
          Dev panel for testing games. Choose a demo program below — it updates the admin demo
          profile so landing, lessons, and NOVA match that track. Scroll down for the full
          completion preview.
        </p>

        <div
          style={{
            background: "#0c1222",
            border: "1px solid rgba(99,102,241,0.45)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Demo program (admin token)
          </p>
          <p style={{ color: "#cbd5e1", fontSize: "12px", marginBottom: "12px", lineHeight: 1.5 }}>
            Stored on the admin demo user. Open Demo or paste the token — you get Explorers (lessons
            1–3 + games) or Builders (lessons 11–13 + neuro-sim).
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              type="button"
              disabled={courseSaving || adminCourse === null}
              onClick={() => void setProgram("AI Explorers")}
              style={{
                flex: "1 1 140px",
                borderRadius: "10px",
                padding: "14px 16px",
                cursor: courseSaving || adminCourse === null ? "wait" : "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                border:
                  resolvedProgram === "AI Explorers"
                    ? "2px solid #22d3ee"
                    : "1px solid #334155",
                background: resolvedProgram === "AI Explorers" ? "rgba(34,211,238,0.12)" : "#020617",
                color: resolvedProgram === "AI Explorers" ? "#e0f2fe" : "#94a3b8",
              }}
            >
              AI Explorers
              <span style={{ display: "block", fontWeight: "normal", fontSize: "11px", marginTop: "6px", opacity: 0.85 }}>
                Lessons 1–3 · Neuropolis games
              </span>
            </button>
            <button
              type="button"
              disabled={courseSaving || adminCourse === null}
              onClick={() => void setProgram("AI Builders")}
              style={{
                flex: "1 1 140px",
                borderRadius: "10px",
                padding: "14px 16px",
                cursor: courseSaving || adminCourse === null ? "wait" : "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                border:
                  resolvedProgram === "AI Builders"
                    ? "2px solid #22d3ee"
                    : "1px solid #334155",
                background: resolvedProgram === "AI Builders" ? "rgba(34,211,238,0.12)" : "#020617",
                color: resolvedProgram === "AI Builders" ? "#e0f2fe" : "#94a3b8",
              }}
            >
              AI Builders
              <span style={{ display: "block", fontWeight: "normal", fontSize: "11px", marginTop: "6px", opacity: 0.85 }}>
                Lessons 11–13 · Python sim
              </span>
            </button>
          </div>
          {adminCourse === "AI Innovators" ? (
            <p style={{ color: "#fbbf24", fontSize: "11px", marginTop: "10px" }}>
              Profile is AI Innovators — pick Explorers or Builders above to set a concrete demo track.
            </p>
          ) : null}
        </div>

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
          onClick={() => void loadAdmin()}
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
          Refresh token and program
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
              {resolvedProgram === "AI Explorers" ? (
                <>
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
                </>
              ) : (
                <>
                  <a
                    href={`/demo/lesson/11?token=${q}`}
                    style={{
                      background: "#0e7490",
                      color: "white",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    Sim lesson 11
                  </a>
                  <a
                    href={`/demo/lesson/12?token=${q}`}
                    style={{
                      background: "#0369a1",
                      color: "white",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    Sim lesson 12
                  </a>
                  <a
                    href={`/demo/lesson/13?token=${q}`}
                    style={{
                      background: "#1d4ed8",
                      color: "white",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    Sim lesson 13
                  </a>
                </>
              )}
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
