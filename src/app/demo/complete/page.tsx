"use client";

import DemoCompleteCelebration from "@/components/demo/DemoCompleteCelebration";
import type { DemoUser } from "@/types/demo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

/** Course-aware: Builders need 11–13; Explorers, Innovators, and unknown use 1–3. */
function isCourseDemoComplete(
  course: DemoUser["course"] | undefined,
  lessonsComplete: number[]
): boolean {
  const done = new Set(lessonsComplete);
  if (course === "AI Builders") {
    return [11, 12, 13].every((id) => done.has(id));
  }
  return [1, 2, 3].every((id) => done.has(id));
}

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = /(?:^|; )demo_token=([^;]*)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

function CompletePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [user, setUser] = useState<DemoUser | null>(null);
  const [bootStatus, setBootStatus] = useState<"loading" | "ready" | "noop">(
    "loading"
  );

  const loadUser = useCallback(
    async (t: string) => {
      setBootStatus("loading");
      try {
        const res = await fetch(`/api/demo/user?token=${encodeURIComponent(t)}`);
        if (!res.ok) {
          setUser(null);
          setBootStatus("ready");
          return;
        }
        const data = (await res.json()) as DemoUser;
        if (!isCourseDemoComplete(data.course, data.lessonsComplete ?? [])) {
          setBootStatus("noop");
          router.replace(`/demo${t ? `?token=${encodeURIComponent(t)}` : ""}`);
          return;
        }
        setUser({
          ...data,
          earnedBadges: data.earnedBadges ?? [],
        });
        setBootStatus("ready");
      } catch {
        setUser(null);
        setBootStatus("ready");
      }
    },
    [router]
  );

  useEffect(() => {
    const t = tokenFromUrl ?? readCookieToken();
    if (!t) {
      setUser(null);
      setBootStatus("ready");
      router.replace("/?error=no-token");
      return;
    }
    void loadUser(t);
  }, [tokenFromUrl, loadUser, router]);

  if (bootStatus === "loading" || bootStatus === "noop") {
    return (
      <div className="min-h-screen animate-pulse">
        <div className="h-48 bg-indigo-900/20" />
        <div className="mx-auto mt-8 h-64 max-w-sm rounded-2xl bg-indigo-400/20" />
      </div>
    );
  }

  if (!user || !isCourseDemoComplete(user.course, user.lessonsComplete ?? [])) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <p className="font-semibold text-slate-300">
          We couldn&apos;t load your completion record.
        </p>
        <Link href="/demo" className="mt-4 text-cyan-400 underline">
          Back to demo
        </Link>
      </div>
    );
  }

  return <DemoCompleteCelebration user={user} />;
}

export default function DemoCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-300/20 border-t-indigo-400" />
        </div>
      }
    >
      <CompletePageInner />
    </Suspense>
  );
}
