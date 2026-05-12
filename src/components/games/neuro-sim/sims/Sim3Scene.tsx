"use client";

import NeuroSimEmbedded from "../NeuroSimEmbedded";

type Props = {
  readonly onComplete: () => void | Promise<void>;
  readonly onExit: () => void | Promise<void>;
};

export default function Sim3Scene({ onComplete, onExit }: Props) {
  return (
    <NeuroSimEmbedded
      innerLessonId={3}
      onComplete={onComplete}
      onExit={onExit}
    />
  );
}
