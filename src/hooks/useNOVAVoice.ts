"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface UseNOVAVoiceProps {
  onTranscript: (text: string) => void;
}

type SpeechRecognitionEventLike = {
  results: { 0: { 0: { transcript: string } } };
};

type SpeechRecognitionErrorLike = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof globalThis.window === "undefined") return null;
  const w = globalThis.window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useNOVAVoice({ onTranscript }: UseNOVAVoiceProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [firstAttempt, setFirstAttempt] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isListeningRef = useRef(false);

  const startListening = useCallback(() => {
    if (typeof globalThis.window === "undefined") return;

    const loc = globalThis.window.location;
    if (loc.protocol !== "https:" && loc.hostname !== "localhost") {
      setError("Voice requires HTTPS. Works on the live site.");
      return;
    }

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setError("Use Chrome for voice support.");
      return;
    }

    if (isListeningRef.current) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setVoiceState("listening");
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          onTranscript(transcript.trim());
          setVoiceState("thinking");
        }
        isListeningRef.current = false;
      };

      recognition.onerror = (event: SpeechRecognitionErrorLike) => {
        if (event.error === "not-allowed") {
          setError(
            "Click the 🔒 icon in your browser address bar and allow microphone."
          );
        } else if (event.error === "no-speech") {
          isListeningRef.current = false;
          setVoiceState("idle");
          setError(null);
          setTimeout(() => startListening(), 300);
          return;
        } else if (event.error === "aborted") {
          isListeningRef.current = false;
          setVoiceState("idle");
          setError(null);
          return;
        } else {
          setError(null);
        }
        isListeningRef.current = false;
        setVoiceState("idle");
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setError("Voice not supported. Type instead.");
      setVoiceState("idle");
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setVoiceState("idle");
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof globalThis.window === "undefined") return;
    const synth = globalThis.window.speechSynthesis;
    if (!synth) return;

    setVoiceState("speaking");
    synth.cancel();

    const clean = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/\n/g, " ")
      .trim();

    const sentences = clean
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);

    if (sentences.length === 0) {
      setVoiceState("idle");
      return;
    }

    let index = 0;

    const getVoice = () => {
      const voices = synth.getVoices();
      return (
        voices.find((v) => v.name.includes("Zira")) ||
        voices.find((v) => v.name.includes("Samantha")) ||
        voices.find(
          (v) =>
            v.lang === "en-US" &&
            !v.name.includes("David") &&
            !v.name.includes("Mark") &&
            !v.name.includes("James")
        ) ||
        voices.find((v) => v.lang.startsWith("en"))
      );
    };

    const speakNext = () => {
      if (index >= sentences.length) {
        setVoiceState("idle");
        return;
      }
      const s = sentences[index];
      if (!s?.trim()) {
        index++;
        speakNext();
        return;
      }

      const u = new SpeechSynthesisUtterance(s);
      const voice = getVoice();
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.pitch = 1.1;
      u.volume = 1;
      u.onend = () => {
        index++;
        setTimeout(speakNext, 80);
      };
      u.onerror = () => {
        index++;
        speakNext();
      };
      synth.speak(u);
    };

    const voices = synth.getVoices();
    if (voices.length === 0) {
      synth.onvoiceschanged = speakNext;
    } else {
      speakNext();
    }

    const keepAlive = setInterval(() => {
      if (synth.speaking) {
        synth.pause();
        synth.resume();
      } else {
        clearInterval(keepAlive);
      }
    }, 10000);
  }, []);

  const stopSpeaking = useCallback(() => {
    globalThis.window?.speechSynthesis?.cancel();
    setVoiceState("idle");
  }, []);

  const toggleListening = useCallback(() => {
    if (voiceState === "listening") stopListening();
    else if (voiceState === "speaking") {
      stopSpeaking();
      setTimeout(startListening, 200);
    } else if (voiceState === "idle") {
      if (firstAttempt) {
        setFirstAttempt(false);
        setTimeout(() => startListening(), 500);
      } else {
        startListening();
      }
    }
  }, [voiceState, firstAttempt, startListening, stopListening, stopSpeaking]);

  return {
    voiceState,
    error,
    speak,
    stopSpeaking,
    toggleListening,
    isListening: voiceState === "listening",
    isSpeaking: voiceState === "speaking",
    isIdle: voiceState === "idle",
  };
}
