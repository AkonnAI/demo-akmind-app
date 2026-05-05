import DemoAmbientBackground from "@/components/demo/DemoAmbientBackground";
import type { ReactNode } from "react";

export default function DemoLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div
      className="relative min-h-screen"
      style={{ backgroundColor: "var(--bg-space)" }}
    >
      <DemoAmbientBackground />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
