"use client";
import { useEffect, useState } from "react";
import { Pause, Sparkles } from "lucide-react";
import { Text } from "./provider";

export function SpatialExperience() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stored = "";
    try {
      stored = localStorage.getItem("us-motion") || "";
    } catch {}
    setPaused(stored === "paused" || media.matches);
  }, []);
  useEffect(() => {
    document.body.dataset.motion = paused ? "paused" : "on";
  }, [paused]);
  return (
    <>
      <div className="spatial-backdrop" aria-hidden="true">
        <div className="spatial-grid" />
        <span className="spatial-orb orb-violet" />
        <span className="spatial-orb orb-mint" />
        <span className="spatial-ring" />
        <span className="spatial-spark spark-a" />
        <span className="spatial-spark spark-b" />
      </div>
      <button
        className="spatial-motion-control"
        type="button"
        aria-pressed={paused}
        onClick={() => {
          const next = !paused;
          setPaused(next);
          try {
            localStorage.setItem("us-motion", next ? "paused" : "on");
          } catch {}
        }}
      >
        {paused ? <Sparkles size={15} /> : <Pause size={15} />}
        <Text
          bn={paused ? "অ্যানিমেশন চালু" : "অ্যানিমেশন কমান"}
          en={paused ? "Enable animation" : "Reduce animation"}
        />
      </button>
    </>
  );
}
