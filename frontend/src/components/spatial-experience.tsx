"use client";
import { useEffect } from "react";

export function SpatialExperience() {
  useEffect(() => {
    document.body.dataset.motion = "paused";
  }, []);
  return null;
}
