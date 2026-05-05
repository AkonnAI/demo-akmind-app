"use client";

import DemoCompleteCelebration from "@/components/demo/DemoCompleteCelebration";
import { DEMO_COMPLETE_PREVIEW_USER } from "@/lib/demo-complete-preview-user";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

function PreviewInner() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAllowed(sessionStorage.getItem("admin_authed") === "1");
  }, []);

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050510] p-8 text-center text-slate-300">
        <p>Open this screen from the Admin panel after logging in.</p>
        <Link href="/admin" className="text-indigo-400 underline">
          Go to Admin
        </Link>
      </div>
    );
  }

  return <DemoCompleteCelebration user={DEMO_COMPLETE_PREVIEW_USER} isPreview />;
}

export default function DemoCompletePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050510]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-300/20 border-t-indigo-400" />
        </div>
      }
    >
      <PreviewInner />
    </Suspense>
  );
}
