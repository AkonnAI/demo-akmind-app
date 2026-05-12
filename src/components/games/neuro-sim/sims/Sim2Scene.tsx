"use client";

import { useCallback, useState } from "react";
import BootScreen from "../screens/BootScreen";
import NeuroSimEmbedded from "../NeuroSimEmbedded";

type Props = {
  readonly onComplete: () => void | Promise<void>;
  readonly onExit: () => void | Promise<void>;
};

export default function Sim2Scene({ onComplete, onExit }: Props) {
  const [simulationArmed, setSimulationArmed] = useState(false);

  const handleExit = useCallback(() => {
    void Promise.resolve(onExit()).catch(() => {});
  }, [onExit]);

  return (
    <>
      {simulationArmed ? (
        <NeuroSimEmbedded
          innerLessonId={2}
          onComplete={onComplete}
          onExit={onExit}
        />
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1000,
              width: "100%",
              height: "100%",
            }}
          >
            <BootScreen embed onEmbedDone={() => setSimulationArmed(true)} />
          </div>
          <button
            type="button"
            aria-label="Exit game"
            onClick={handleExit}
            style={{
              position: "fixed",
              top: 12,
              right: 12,
              zIndex: 1100,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.55)",
              borderRadius: 8,
              color: "#f87171",
              fontSize: 13,
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Exit
          </button>
        </>
      )}
    </>
  );
}
