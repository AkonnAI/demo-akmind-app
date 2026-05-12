"use client";

import { useEffect } from "react";

/**
 * Monaco Editor fires console.error("Canceled") / console.error(CancellationError)
 * whenever it cancels pending async work (IntelliSense, model updates, etc.) during
 * unmount or rapid user input. Next.js dev overlay intercepts every console.error and
 * promotes it to a full-screen error. This component silently drops those specific
 * benign Monaco errors while leaving all other console.error calls intact.
 */
export default function MonacoErrorFilter() {
  useEffect(() => {
    const original = console.error.bind(console);

    console.error = (...args: unknown[]) => {
      const first = args[0];

      // Monaco CancellationError — completely benign
      if (
        (typeof first === "string" && /^Canceled/.test(first)) ||
        (first instanceof Error &&
          (first.name === "Canceled" ||
            /^Canceled/.test(first.message) ||
            first.message === "Canceled"))
      ) {
        return;
      }

      // Next.js wraps Monaco errors in its own unhandled-error object
      if (
        typeof first === "object" &&
        first !== null &&
        "message" in first &&
        typeof (first as { message: unknown }).message === "string" &&
        /^Canceled/.test((first as { message: string }).message)
      ) {
        return;
      }

      original(...args);
    };

    return () => {
      console.error = original;
    };
  }, []);

  return null;
}
