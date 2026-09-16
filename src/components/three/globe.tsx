"use client";

import { Component, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useReducedMotion } from "motion/react";
import { OrbitFallback } from "@/components/effects/orbit";
import { useMounted } from "@/components/theme/theme-toggle";

const GlobeScene = dynamic(() => import("./globe-scene"), { ssr: false, loading: () => null });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Theme-aware WebGL globe. Client-only, paused off-screen, a single still
 * frame for reduced-motion users, CSS fallback when WebGL is unavailable.
 */
export function Globe({ activeIndex, className }: { activeIndex: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const reduce = useReducedMotion();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capability detection must run on the client
    setSupported(hasWebGL());
    setLowPower(window.innerWidth < 768 || (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.01 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div ref={ref} className={className} aria-hidden>
      {supported === false && <OrbitFallback />}
      {supported && mounted && (
        <SceneBoundary fallback={<OrbitFallback />}>
          <GlobeScene theme={theme} animate={visible && !reduce} lowPower={lowPower} activeIndex={activeIndex} />
        </SceneBoundary>
      )}
    </div>
  );
}
