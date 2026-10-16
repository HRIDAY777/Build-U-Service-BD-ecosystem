"use client";

import { useState } from "react";
import { Pause, Play, Sparkles } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { Text } from "./provider";

export function AnimatedBrand() {
  const [paused, setPaused] = useState(false);
  return <section className={`brand-scene${paused ? " is-paused" : ""}`} aria-label="U Service">
    <div className="brand-scene-label"><Sparkles size={15} /><Text bn="এক পরিচয়ে, সব সেবা" en="ONE BRAND. EVERYDAY POSSIBILITIES." /></div>
    <div className="brand-perspective">
      <div className="brand-orbit orbit-one" aria-hidden="true" />
      <div className="brand-orbit orbit-two" aria-hidden="true" />
      <div className="brand-pedestal" aria-hidden="true" />
      <div className="brand-object">
        {[1, 2, 3, 4, 5, 6].map((layer) => <span key={layer} className={`brand-depth depth-${layer}`} aria-hidden="true" />)}
        <div className="brand-face"><BrandLogo eager /><span className="brand-face-shine" aria-hidden="true" /></div>
      </div>
      <span className="brand-satellite satellite-one" aria-hidden="true">✦</span>
      <span className="brand-satellite satellite-two" aria-hidden="true">✧</span>
    </div>
    <div className="brand-scene-footer"><span><Text bn="আপনার প্রতিদিনের সঙ্গী" en="Your everyday, connected." /></span><button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} className="brand-motion-toggle">{paused ? <Play size={15} /> : <Pause size={15} />}<Text bn={paused ? "চালু করুন" : "থামান"} en={paused ? "Play motion" : "Pause motion"} /></button></div>
  </section>;
}
