"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, BrainCircuit } from "lucide-react";
import NOVACharacter from "./NOVACharacter";
import { useNOVAVoice } from "@/hooks/useNOVAVoice";
import NOVAVoiceButton from "@/components/NOVAVoiceButton";
import type { DemoUser } from "@/types/demo";

interface Message {
  id: string;
  role: "user" | "nova";
  content: string;
}

interface NOVAChatProps {
  userName?: string;
  childName?: string;
  currentLesson?: string;
  xp?: number;
  /** Lesson IDs completed in the demo (e.g. [1, 2]) or a count for legacy callers */
  lessonsComplete?: number | number[];
  /** Stable key for chat memory (e.g. email) */
  userKey?: string;
  currentModule?: number;
  /** Current demo lesson number 1–3, for curriculum hints */
  lessonOrder?: number;
  quizScores?: Record<string, number> | null;
  badgeEarned?: boolean;
  course?: DemoUser["course"];
}

const DEMO_STARTERS = [
  "What is artificial intelligence?",
  "Help me understand this lesson",
  "What happens after the demo?",
  "How am I doing so far?",
];

export default function NOVAChat({
  userName,
  childName: childNameProp,
  currentLesson,
  xp = 0,
  lessonsComplete = 0,
  userKey,
  currentModule = 1,
  lessonOrder = 1,
  quizScores,
  badgeEarned = false,
  course,
}: Readonly<NOVAChatProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const greetName =
    (childNameProp ?? userName)?.trim().split(/\s+/)[0] ?? "";
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "nova",
      content: `Hi${greetName ? " " + greetName : ""}! I am NOVA. I am here to help you learn about AI and guide you through your demo lessons. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emotion, setEmotion] = useState<
    "happy" | "thinking" | "excited" | "concerned"
  >("happy");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => {});

  const {
    voiceState,
    error: voiceError,
    speak,
    toggleListening,
  } = useNOVAVoice({
    onTranscript: (text) => {
      void sendMessageRef.current(text);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncMobile = () => setIsMobile(window.innerWidth < 768);
    syncMobile();
    window.addEventListener("resize", syncMobile);
    return () => window.removeEventListener("resize", syncMobile);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setEmotion("thinking");

      try {
        const res = await fetch("/api/nova", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            message: text.trim(),
            conversationHistory: messages.slice(-12),
            userName,
            childName: childNameProp ?? userName,
            currentLesson,
            xp,
            lessonsComplete,
            userId: userKey,
            currentModule,
            lessonOrder,
            quizScores: quizScores ?? undefined,
            badgeEarned,
            course,
          }),
        });

        const data = (await res.json()) as {
          response?: string;
          error?: boolean;
        };

        if (!res.ok) {
          const blurb =
            res.status === 403
              ? "This deployment blocked the chat request. If you are the developer, allow your hosting URL for /api routes or redeploy with the latest app fix."
              : data.response?.trim() ||
                `NOVA returned an error (${res.status}). Try again later.`;
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "nova",
              content: blurb,
            },
          ]);
          void speak(blurb, { emotion: "concerned" });
          setEmotion("concerned");
          return;
        }

        const responseText = data.response ?? "";
        if (!responseText.trim()) {
          const blurb = "NOVA sent an empty reply. Try asking again.";
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "nova",
              content: blurb,
            },
          ]);
          void speak(blurb, { emotion: "concerned" });
          setEmotion("concerned");
          return;
        }

        const lower = responseText.toLowerCase();
        let replyEmotion:
          | "happy"
          | "thinking"
          | "excited"
          | "concerned" = "happy";
        if (
          lower.includes("amazing") ||
          lower.includes("brilliant") ||
          lower.includes("excellent")
        ) {
          replyEmotion = "excited";
        } else if (lower.includes("hmm") || lower.includes("interesting")) {
          replyEmotion = "thinking";
        } else if (
          lower.includes("struggling") ||
          lower.includes("difficult")
        ) {
          replyEmotion = "concerned";
        }

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "nova",
            content: responseText,
          },
        ]);
        void speak(responseText, { emotion: replyEmotion });

        setEmotion(replyEmotion);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "nova",
            content: "I had a little trouble there. Try asking again!",
          },
        ]);
        setEmotion("concerned");
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      messages,
      userName,
      childNameProp,
      currentLesson,
      xp,
      lessonsComplete,
      userKey,
      currentModule,
      lessonOrder,
      quizScores,
      badgeEarned,
      course,
      speak,
    ]
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  let currentEmotion: "happy" | "thinking" | "excited" | "concerned" = emotion;
  if (voiceState === "listening") currentEmotion = "excited";
  else if (voiceState === "thinking") currentEmotion = "thinking";
  else if (voiceState === "speaking") currentEmotion = "happy";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  if (!isOpen) {
    return (
      <div
        className="nova-float-button"
        style={{
          position: "fixed",
          bottom: isMobile ? "80px" : "24px",
          right: isMobile ? "16px" : "24px",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            position: "relative",
          }}
          aria-label="Open NOVA"
        >
          <div
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: "50%",
              border: "2px solid rgba(99,102,241,0.3)",
              animation: "nova-ring-expand 2s ease-out infinite",
            }}
          />
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366F1, #06B6D4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 8px 32px rgba(99,102,241,0.5), 0 0 24px rgba(6,182,212,0.3)",
            }}
          >
            <BrainCircuit size={24} color="white" />
          </div>
        </button>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            background: "linear-gradient(90deg, #6366F1, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          NOVA
        </div>
        <style>{`
          @keyframes nova-ring-expand {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: isMobile ? "0" : "24px",
        right: isMobile ? "0" : "24px",
        left: isMobile ? "0" : "auto",
        top: isMobile ? "0" : "auto",
        zIndex: 60,
        width: isMobile ? "100%" : "360px",
        height: isMobile ? "100%" : "520px",
        background: "rgba(8,10,22,0.95)",
        backdropFilter: "blur(24px)",
        borderRadius: isMobile ? "0" : "20px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), var(--glow-indigo)",
        border: "1px solid rgba(99,102,241,0.2)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(15,10,40,0.95), rgba(10,18,48,0.95))",
          borderBottom: "1px solid rgba(99,102,241,0.15)",
          padding: "0 16px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <NOVACharacter size="sm" emotion={currentEmotion} animate />
        <div style={{ flex: 1 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>NOVA</div>
          <div
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10B981",
              }}
            />
            AI Learning Guide
            {voiceState !== "idle" ? (
              <span
                style={{
                  fontSize: 10,
                  color:
                    voiceState === "listening"
                      ? "#EF4444"
                      : voiceState === "thinking"
                        ? "#F59E0B"
                        : "#10B981",
                  fontFamily: "monospace",
                  letterSpacing: "0.08em",
                }}
              >
                {voiceState === "listening"
                  ? "LISTENING"
                  : voiceState === "thinking"
                    ? "THINKING"
                    : "SPEAKING"}
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          background: "rgba(6,8,20,0.6)",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            {msg.role === "nova" && (
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366F1, #06B6D4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                N
              </div>
            )}
            <div
              style={{
                maxWidth: "80%",
                background:
                  msg.role === "nova"
                    ? "rgba(99,102,241,0.08)"
                    : "linear-gradient(135deg, #4F46E5, #6366F1)",
                border:
                  msg.role === "nova" ? "1px solid rgba(99,102,241,0.15)" : "none",
                color: msg.role === "nova" ? "#CBD5E1" : "white",
                borderRadius:
                  msg.role === "nova" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                padding: "10px 14px",
                fontSize: "13px",
                lineHeight: 1.6,
                boxShadow:
                  msg.role === "nova"
                    ? "none"
                    : "var(--glow-indigo)",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366F1, #06B6D4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              N
            </div>
            <div
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: "4px 14px 14px 14px",
                padding: "12px 16px",
                display: "flex",
                gap: "4px",
              }}
            >
              {[0, 0.2, 0.4].map((delay) => (
                <div
                  key={`typing-${delay}`}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#6366F1",
                    animation: `nova-typing 1s ease-in-out ${delay}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "4px",
            }}
          >
            {DEMO_STARTERS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => void sendMessage(prompt)}
                style={{
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.15)",
                  borderRadius: "16px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  color: "#94A3B8",
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.15)";
                  e.currentTarget.style.color = "#E2E8F0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                  e.currentTarget.style.color = "#94A3B8";
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(99,102,241,0.15)",
          padding: "12px 12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          background: "rgba(8,10,22,0.92)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <NOVAVoiceButton
            voiceState={voiceState}
            onToggle={toggleListening}
            error={voiceError}
            size="sm"
          />
          <input
            className="nova-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Ask NOVA anything..."
            disabled={loading}
            style={{
              flex: 1,
              height: "40px",
              borderRadius: "10px",
              border: inputFocused
                ? "1px solid #06B6D4"
                : "1px solid rgba(99,102,241,0.2)",
              boxShadow: inputFocused ? "var(--glow-cyan)" : "none",
              padding: "0 12px",
              fontSize: "13px",
              outline: "none",
              color: "#F0F4FF",
              background: "rgba(255,255,255,0.04)",
            }}
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background:
                input.trim() && !loading
                  ? "linear-gradient(135deg, #6366F1, #06B6D4)"
                  : "#E2E8F0",
              border: "none",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Send size={16} color={input.trim() && !loading ? "white" : "#94A3B8"} />
          </button>
        </div>
        {voiceError && voiceState === "idle" ? (
          <div
            style={{
              fontSize: 10,
              color: "#EF4444",
              maxWidth: 220,
              textAlign: "center",
              lineHeight: 1.4,
              padding: "4px 8px",
              background: "rgba(239,68,68,0.08)",
              borderRadius: 6,
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {voiceError}
          </div>
        ) : null}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .nova-input {
            font-size: 16px !important;
          }
        }
        .nova-input::placeholder {
          color: #475569;
        }
        @keyframes nova-typing {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
