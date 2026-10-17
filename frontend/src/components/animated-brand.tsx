"use client";
import { useEffect, useRef, useState } from "react";
import { Text } from "./provider";
import type { createLogoScene } from "@/lib/logo-scene";

export function AnimatedBrand({
  exportable = false,
}: {
  exportable?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cancelRecording = useRef<(() => void) | null>(null);
  const control = useRef<Awaited<ReturnType<typeof createLogoScene>> | null>(
    null,
  );
  const [ready, setReady] = useState(false),
    [paused, setPaused] = useState(false),
    [recording, setRecording] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | undefined;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let syncMotion: (() => void) | undefined;
    import("@/lib/logo-scene")
      .then((m) => m.createLogoScene(canvas.current!))
      .then((scene) => {
        if (cancelled) {
          scene.dispose();
          return;
        }
        control.current = scene;
        setReady(true);
        const sync = () => {
          const stop =
            document.body.dataset.motion === "paused" || media.matches;
          scene.pause(stop);
          if (stop) scene.finish();
          setPaused(stop);
        };
        sync();
        syncMotion = sync;
        media.addEventListener("change", sync);
        observer = new MutationObserver(sync);
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["data-motion"],
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      if (syncMotion) media.removeEventListener("change", syncMotion);
      cancelRecording.current?.();
      control.current?.dispose();
      control.current = null;
    };
  }, []);
  function record() {
    if (!canvas.current || !control.current || recording) return;
    const mime = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find(
      (t) =>
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(t),
    );
    if (!mime) {
      setError(true);
      return;
    }
    const stream = canvas.current.captureStream(30);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 6000000,
      });
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError(true);
      return;
    }
    const chunks: BlobPart[] = [];

    cancelRecording.current = () => {
      clearTimeout(timer);
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.onerror = () => {
      cancelRecording.current?.();
      setRecording(false);
      setError(true);
    };
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: mime })),
        link = document.createElement("a");
      link.href = url;
      link.download = `u-service-logo-intro.${mime.includes("mp4") ? "mp4" : "webm"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      cancelRecording.current = null;
    };
    setRecording(true);
    recorder.start();
    control.current.replay();
    setPaused(false);
    const timer = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 8500);
  }
  return (
    <section className="brand-scene logo-cinema" aria-label="U Service 3D">
      <div className="brand-scene-label">
        <Text bn="এক পরিচয়ে, সব সেবা" en="ONE BRAND. EVERYDAY POSSIBILITIES." />
      </div>
      <div
        style={{
          aspectRatio: "16/9",
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          background: "#fbf6fc",
        }}
      >
        <canvas
          ref={canvas}
          aria-label="U Service company logo assembling in 3D"
          style={{
            width: "100%",
            height: "100%",
            display: ready ? "block" : "none",
          }}
        />
        {!ready && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <img
              src="/images/brand/u-service-logo.png"
              alt="U Service"
              style={{ width: "75%", height: "auto" }}
            />
          </div>
        )}
      </div>
      <div className="brand-scene-footer">
        <span>
          <Text bn="আপনার প্রতিদিনের সঙ্গী" en="Your everyday, connected." />
        </span>
        {ready && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="brand-motion-toggle"
              disabled={recording}
              onClick={() => {
                control.current?.replay();
                setPaused(false);
              }}
            >
              <Text bn="আবার দেখুন" en="Replay" />
            </button>
            <button
              className="brand-motion-toggle"
              disabled={recording}
              aria-pressed={paused}
              onClick={() => {
                control.current?.pause(!paused);
                setPaused(!paused);
              }}
            >
              <Text
                bn={paused ? "চালু করুন" : "থামান"}
                en={paused ? "Play" : "Pause"}
              />
            </button>
            {exportable && (
              <button
                className="brand-motion-toggle"
                disabled={recording}
                onClick={record}
              >
                <Text
                  bn={recording ? "ভিডিও তৈরি হচ্ছে…" : "ভিডিও ডাউনলোড"}
                  en={recording ? "Creating video…" : "Download video"}
                />
              </button>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="status">
          <Text
            bn="এই ডিভাইসে থ্রিডি বা ভিডিও সুবিধা পাওয়া যাচ্ছে না।"
            en="3D or video export is unavailable on this device."
          />
        </p>
      )}
    </section>
  );
}
