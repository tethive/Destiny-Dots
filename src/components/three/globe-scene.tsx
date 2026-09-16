"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { domainTheme } from "@/components/domain";
import { domains } from "@/lib/catalog";

export type GlobeTheme = "light" | "dark";

const R = 2;

const palette = {
  light: {
    dots: new THREE.Color("#3b2f86"),
    dotsOpacity: 0.5,
    occluder: new THREE.Color("#ffffff"),
    atmosphere: new THREE.Color("#8b6cf7"),
    atmosphereIntensity: 0.32,
    arc: new THREE.Color("#8b80b8"),
    ring: "#b9b2d6",
    hub: "#4f35c9",
    blending: THREE.NormalBlending,
  },
  dark: {
    dots: new THREE.Color("#b7aaff"),
    dotsOpacity: 0.55,
    occluder: new THREE.Color("#110f1a"),
    atmosphere: new THREE.Color("#7c5cf6"),
    atmosphereIntensity: 0.75,
    arc: new THREE.Color("#6d6594"),
    ring: "#3d3760",
    hub: "#ffffff",
    blending: THREE.AdditiveBlending,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function fromLatLon(lat: number, lon: number, radius = R) {
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  );
}

/** Evenly spread domain nodes: golden-angle longitudes, mid latitudes. */
const nodes = domains.map((d, i) => {
  const lat = Math.asin(-0.62 + (1.24 * (i + 0.5)) / domains.length);
  const lon = (i * 2.39996) % (Math.PI * 2);
  return { tag: d.tag, color: domainTheme[d.tag].hex, lat, lon, pos: fromLatLon(lat, lon) };
});
const hub = { lat: 0.18, lon: -0.9, pos: fromLatLon(0.18, -0.9) };

function arcCurve(a: THREE.Vector3, b: THREE.Vector3) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const lift = R + a.distanceTo(b) * 0.38 + 0.08;
  mid.normalize().multiplyScalar(lift);
  return new THREE.QuadraticBezierCurve3(a.clone().multiplyScalar(1.005), mid, b.clone().multiplyScalar(1.005));
}

/** Organic "landmass" pattern so the sphere reads as a world, not a ball. */
function landMask(p: THREE.Vector3) {
  const n =
    Math.sin(p.x * 2.1 + Math.sin(p.y * 1.7)) * Math.cos(p.z * 1.9 + p.y * 0.8) +
    0.55 * Math.sin(p.y * 3.3 + p.x * 1.2);
  return n > -0.18;
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const dotsVertex = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normalize(position));
    vFacing = dot(n, normalize(-mv.xyz));
    gl_PointSize = uSize * aSize * uPixelRatio * (9.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const dotsFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFacing;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float edge = smoothstep(0.5, 0.3, d);
    float limb = smoothstep(-0.05, 0.55, vFacing);
    gl_FragColor = vec4(uColor, edge * limb * uOpacity);
  }
`;

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float k = clamp(-dot(vNormal, vView) / 0.6, 0.0, 1.0);
    float glow = pow(k, 2.4) * uIntensity;
    gl_FragColor = vec4(uColor, glow);
  }
`;

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export default function GlobeScene({
  theme,
  animate,
  lowPower,
  activeIndex,
}: {
  theme: GlobeTheme;
  animate: boolean;
  lowPower: boolean;
  activeIndex: number;
}) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      frameloop={animate ? "always" : "demand"}
      dpr={lowPower ? [1, 1.25] : [1, 2]}
      camera={{ position: [0, 0, 9.6], fov: 36 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <Globe theme={theme} lowPower={lowPower} activeIndex={activeIndex} pointer={pointer} />
    </Canvas>
  );
}

function Globe({
  theme,
  lowPower,
  activeIndex,
  pointer,
}: {
  theme: GlobeTheme;
  lowPower: boolean;
  activeIndex: number;
  pointer: React.RefObject<{ x: number; y: number }>;
}) {
  const colors = palette[theme];
  const group = useRef<THREE.Group>(null);
  const { gl, invalidate } = useThree();
  const active = nodes[activeIndex % nodes.length];

  // Re-render once when inputs change in reduced-motion ("demand") mode.
  useEffect(() => invalidate(), [theme, activeIndex, invalidate]);

  /* Fibonacci sphere of dots, thinned by the land mask. */
  const dots = useMemo(() => {
    const count = lowPower ? 3200 : 6400;
    const positions: number[] = [];
    const sizes: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const p = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(R);
      if (!landMask(p)) continue;
      positions.push(p.x, p.y, p.z);
      sizes.push(0.75 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) * 0.2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
    return geo;
  }, [lowPower]);

  const dotsMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dotsVertex,
        fragmentShader: dotsFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: colors.dots },
          uOpacity: { value: colors.dotsOpacity },
          uSize: { value: 2.6 },
          uPixelRatio: { value: gl.getPixelRatio() },
        },
      }),
    [colors, gl],
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: colors.blending,
        uniforms: { uColor: { value: colors.atmosphere }, uIntensity: { value: colors.atmosphereIntensity } },
      }),
    [colors],
  );

  const glow = useMemo(() => makeGlowTexture(), []);
  const arcs = useMemo(() => nodes.map((n) => arcCurve(hub.pos, n.pos)), []);
  const arcPoints = useMemo(() => arcs.map((c) => c.getPoints(56)), [arcs]);

  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringRef = useRef<THREE.Mesh>(null);
  const satellites = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const px = pointer.current?.x ?? 0;
    const py = pointer.current?.y ?? 0;

    // Turn the globe so the active domain faces the viewer, with light parallax.
    const targetY = -active.lon + 0.55 + px * 0.2;
    const diff = ((((targetY - g.rotation.y) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, g.rotation.y + diff, 2.2, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, active.lat * 0.55 + py * 0.12, 2.2, delta);

    const t = state.clock.elapsedTime;
    // Travelling pulse along the active arc.
    pulseRefs.current.forEach((m, k) => {
      if (!m) return;
      const u = (((t * 0.55 - k * 0.035) % 1) + 1) % 1;
      m.position.copy(arcs[activeIndex % arcs.length].getPoint(u));
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - k / pulseRefs.current.length) * 0.9;
    });
    // Radar ring on the active node.
    if (ringRef.current) {
      const s = 1 + ((t * 0.8) % 1) * 2.2;
      ringRef.current.scale.setScalar(s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - ((t * 0.8) % 1));
    }
    if (satellites.current) satellites.current.rotation.y = t * 0.25;
  });

  const initialRotation: [number, number, number] = [nodes[0].lat * 0.55, -nodes[0].lon + 0.55, 0];
  const activeNormal = active.pos.clone().normalize();
  const ringQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), activeNormal);

  return (
    <group rotation={[0.12, 0, -0.08]}>
      {/* Orbit ring with satellites */}
      <group rotation={[1.25, 0.2, 0.35]}>
        <mesh>
          <torusGeometry args={[R * 1.42, 0.004, 8, 180]} />
          <meshBasicMaterial color={colors.ring} transparent opacity={0.8} />
        </mesh>
        <group ref={satellites}>
          {[0, 2.2, 4.1].map((a) => (
            <mesh key={a} position={[Math.cos(a) * R * 1.42, 0, Math.sin(a) * R * 1.42]}>
              <sphereGeometry args={[0.035, 16, 16]} />
              <meshBasicMaterial color={colors.hub} />
            </mesh>
          ))}
        </group>
      </group>

      <group ref={group} rotation={initialRotation}>
        {/* Atmosphere + occluder + dot shell */}
        <mesh material={atmosphereMaterial} scale={1.22}>
          <sphereGeometry args={[R, 64, 64]} />
        </mesh>
        <mesh>
          <sphereGeometry args={[R * 0.985, 64, 64]} />
          <meshBasicMaterial color={colors.occluder} />
        </mesh>
        <points geometry={dots} material={dotsMaterial} />

        {/* Arcs from the student to every domain */}
        {arcPoints.map((pts, i) => {
          const isActive = i === activeIndex % nodes.length;
          return (
            <Line
              key={nodes[i].tag}
              points={pts}
              color={isActive ? nodes[i].color : colors.arc}
              lineWidth={isActive ? 2 : 1}
              transparent
              opacity={isActive ? 0.95 : theme === "dark" ? 0.22 : 0.28}
              depthWrite={false}
            />
          );
        })}

        {/* Pulse trail */}
        {Array.from({ length: 8 }).map((_, k) => (
          <mesh key={k} ref={(m) => void (pulseRefs.current[k] = m)}>
            <sphereGeometry args={[0.032 * (1 - k * 0.08), 12, 12]} />
            <meshBasicMaterial color={active.color} transparent toneMapped={false} />
          </mesh>
        ))}

        {/* Hub — "you" */}
        <group position={hub.pos.clone().multiplyScalar(1.01)}>
          <mesh>
            <sphereGeometry args={[0.055, 20, 20]} />
            <meshBasicMaterial color={colors.hub} />
          </mesh>
          <sprite scale={0.45}>
            <spriteMaterial map={glow} color={colors.hub} transparent depthWrite={false} blending={colors.blending} opacity={0.6} />
          </sprite>
        </group>

        {/* Domain nodes */}
        {nodes.map((n, i) => {
          const isActive = i === activeIndex % nodes.length;
          return (
            <group key={n.tag} position={n.pos.clone().multiplyScalar(1.01)}>
              <mesh>
                <sphereGeometry args={[isActive ? 0.06 : 0.045, 20, 20]} />
                <meshBasicMaterial color={n.color} toneMapped={false} />
              </mesh>
              <sprite scale={isActive ? 0.7 : 0.38}>
                <spriteMaterial
                  map={glow}
                  color={n.color}
                  transparent
                  depthWrite={false}
                  blending={colors.blending}
                  opacity={theme === "dark" ? 0.85 : 0.45}
                />
              </sprite>
            </group>
          );
        })}

        {/* Radar ring on the active node */}
        <mesh ref={ringRef} position={active.pos.clone().multiplyScalar(1.012)} quaternion={ringQuat}>
          <ringGeometry args={[0.09, 0.105, 48]} />
          <meshBasicMaterial color={active.color} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
