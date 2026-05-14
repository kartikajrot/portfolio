import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useConversation } from "@elevenlabs/react";
import * as THREE from "three";
import "./App.css";

const SECTION_SPACING = 12;
const SECTIONS = [
  "hero",
  "devops",
  "competencies-akelius",
  "amadeus",
  "inria-pec",
  "services",
  "keep",
  "creative",
  "philosophy",
  "gallery",
  "aerial",
];
const SCREEN_WIDTH = 100;
const TIGHT_FOREGROUND_COUNT = 3; // services, keep, creative
const TIGHT_BACKGROUND_COUNT = 2; // gallery, aerial
const TIGHT_AMOUNT = 20;
const TOTAL_FOREGROUND_WIDTH =
  SECTIONS.length * SCREEN_WIDTH - TIGHT_FOREGROUND_COUNT * TIGHT_AMOUNT;
const TOTAL_BACKGROUND_WIDTH =
  SECTIONS.length * SCREEN_WIDTH - TIGHT_BACKGROUND_COUNT * TIGHT_AMOUNT;
const MAX_SECTIONS = TOTAL_FOREGROUND_WIDTH / SCREEN_WIDTH - 1;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ElasticCircle({
  position,
  radius,
  segments = 64,
  color = "#111",
  pointerEnabled = true,
}) {
  const meshRef = useRef();
  const originalPositions = useRef([]);
  const worldCenter = useRef(new THREE.Vector3());

  const geometry = useMemo(() => {
    const geom = new THREE.CircleGeometry(radius, segments);
    originalPositions.current = geom.attributes.position.array.slice();
    return geom;
  }, [radius, segments]);

  useFrame(({ mouse, viewport }) => {
    if (!meshRef.current) return;
    if (!pointerEnabled) return;

    const mx = (mouse.x * viewport.width) / 2;
    const my = (mouse.y * viewport.height) / 2;

    meshRef.current.getWorldPosition(worldCenter.current);

    const positions = meshRef.current.geometry.attributes.position.array;
    const origPos = originalPositions.current;

    for (let i = 0; i < positions.length; i += 3) {
      const x = origPos[i] + worldCenter.current.x;
      const y = origPos[i + 1] + worldCenter.current.y;

      const dx = mx - x;
      const dy = my - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxDist = radius * 1.1;
      if (dist < maxDist) {
        const force = (1 - dist / maxDist) * 0.3;
        positions[i] = origPos[i] + dx * force;
        positions[i + 1] = origPos[i + 1] + dy * force;
      } else {
        positions[i] += (origPos[i] - positions[i]) * 0.1;
        positions[i + 1] += (origPos[i + 1] - positions[i + 1]) * 0.1;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1], position[2]]}
      geometry={geometry}
    >
      <meshBasicMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

function WobbleShape({ children, position, intensity = 0.18 }) {
  const meshRef = useRef();
  useFrame(({ mouse, viewport }) => {
    if (!meshRef.current) return;
    const mx = (mouse.x * viewport.width) / 2;
    const my = (mouse.y * viewport.height) / 2;
    const dx = mx - position[0];
    const dy = my - position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const influence = Math.max(0, 1 - dist / 4.5);
    const target = 1 + influence * intensity;
    meshRef.current.scale.lerp(
      new THREE.Vector3(target, target, target),
      0.12
    );
  });

  return (
    <group ref={meshRef} position={position}>
      {children}
    </group>
  );
}

function ThickLine({
  start,
  end,
  segments = 32,
  color = "white",
  thickness = 0.05,
  pointerEnabled = true,
}) {
  const meshRef = useRef();
  const originalPositions = useRef([]);
  const mouse = useRef({ x: 0, y: 0 });
  const worldOffset = useRef(new THREE.Vector3());

  const geometry = useMemo(() => {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = start[0] + (end[0] - start[0]) * t;
      const y = start[1] + (end[1] - start[1]) * t;
      points.push(new THREE.Vector3(x, y, start[2]));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeom = new THREE.TubeGeometry(curve, segments, thickness, 8, false);
    originalPositions.current = tubeGeom.attributes.position.array.slice();
    return tubeGeom;
  }, [start, end, segments, thickness]);

  useFrame(({ mouse: m, viewport }) => {
    if (!meshRef.current) return;
    if (!pointerEnabled) return;

    mouse.current.x = (m.x * viewport.width) / 2;
    mouse.current.y = (m.y * viewport.height) / 2;

    meshRef.current.getWorldPosition(worldOffset.current);

    const positions = meshRef.current.geometry.attributes.position.array;
    const origPos = originalPositions.current;

    for (let i = 0; i < positions.length; i += 3) {
      const x = origPos[i] + worldOffset.current.x;
      const y = origPos[i + 1] + worldOffset.current.y;

      const dx = mouse.current.x - x;
      const dy = mouse.current.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxDist = 1;
      if (dist < maxDist) {
        const force = (1 - dist / maxDist) * 0.2;
        positions[i] = origPos[i] + dx * force;
        positions[i + 1] = origPos[i + 1] + dy * force;
      } else {
        positions[i] += (origPos[i] - positions[i]) * 0.1;
        positions[i + 1] += (origPos[i + 1] - positions[i + 1]) * 0.1;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function BouncingBall({ initialPosition, onDisappear, circles, radius = 0.1 }) {
  const meshRef = useRef();
  const velocity = useRef({ x: (Math.random() - 0.5) * 0.03, y: 0, z: 0 });
  const lifetime = useRef(0);
  const maxLifetime = 260;

  useFrame(({ viewport }) => {
    if (!meshRef.current) return;

    lifetime.current += 1;
    if (lifetime.current > maxLifetime) {
      onDisappear();
      return;
    }

    velocity.current.y -= 0.005;

    circles.forEach((circle) => {
      const dx = meshRef.current.position.x - circle.position[0];
      const dy = meshRef.current.position.y - circle.position[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < circle.radius + 0.1) {
        const angle = Math.atan2(dy, dx);
        const force = 0.15;
        velocity.current.x += Math.cos(angle) * force;
        velocity.current.y += Math.sin(angle) * force;

        const overlap = circle.radius + 0.1 - dist;
        meshRef.current.position.x += Math.cos(angle) * overlap;
        meshRef.current.position.y += Math.sin(angle) * overlap;
      }
    });

    meshRef.current.position.x += velocity.current.x;
    meshRef.current.position.y += velocity.current.y;

    const ground = -viewport.height / 2;
    if (meshRef.current.position.y - 0.1 < ground) {
      meshRef.current.position.y = ground + 0.1;
      velocity.current.y *= -0.65;
      velocity.current.x *= 0.92;
    }

    const rightWall = viewport.width / 2 + 2;
    if (meshRef.current.position.x + 0.1 > rightWall) {
      onDisappear();
    }

    const fadeStart = maxLifetime - 30;
    if (lifetime.current > fadeStart) {
      const opacity = 1 - (lifetime.current - fadeStart) / 30;
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef} position={initialPosition}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color="#111" transparent />
    </mesh>
  );
}

function ParticleSystem({ circles }) {
  const [particles, setParticles] = useState([]);
  const { viewport } = useThree();
  const nextId = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const x = (Math.random() - 0.5) * viewport.width;
      const y = viewport.height / 2 + 1;
      const radius = 0.05 + Math.random() * 0.15;

      setParticles((prev) => [
        ...prev,
        { id: nextId.current++, position: [x, y, 0], radius },
      ]);
    }, 850);

    return () => clearInterval(interval);
  }, [viewport]);

  const removeParticle = (id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      {particles.map((particle) => (
        <BouncingBall
          key={particle.id}
          initialPosition={particle.position}
          radius={particle.radius}
          circles={circles}
          onDisappear={() => removeParticle(particle.id)}
        />
      ))}
    </>
  );
}

function Scene({ progressRef, pointerEnabled = true }) {
  const { viewport, size } = useThree();
  const worldRef = useRef();
  const frameRef = useRef(0);
  const [linePositions, setLinePositions] = useState({
    line1: { start: [-7, 0.5, 0], end: [-4.2, 0.5, 0] },
    line2: { start: [-8, -1.5, 0], end: [-4.2, -1.5, 0] },
  });

  const updateLinePositions = () => {
    const kartikEl = document.getElementById("kartik-text");
    const ajrotEl = document.getElementById("ajrot-text");

    if (kartikEl && ajrotEl) {
      const kartikRect = kartikEl.getBoundingClientRect();
      const ajrotRect = ajrotEl.getBoundingClientRect();

      const kartikY =
        -(kartikRect.bottom / size.height) * viewport.height +
        viewport.height / 2 +
        0.3;
      const ajrotY =
        -(ajrotRect.bottom / size.height) * viewport.height +
        viewport.height / 2 +
        0.3;

      const kartikStartX =
        (kartikRect.left / size.width) * viewport.width - viewport.width / 2;
      const kartikEndX =
        (kartikRect.right / size.width) * viewport.width - viewport.width / 2;

      const ajrotStartX =
        (ajrotRect.left / size.width) * viewport.width - viewport.width / 2;
      const ajrotEndX =
        (ajrotRect.right / size.width) * viewport.width - viewport.width / 2;

      setLinePositions({
        line1: {
          start: [kartikStartX + 1.2, kartikY - 0.1, 0],
          end: [kartikEndX, kartikY - 0.1, 0],
        },
        line2: {
          start: [ajrotStartX, ajrotY - 0.1, 0],
          end: [ajrotEndX - 2.4, ajrotY - 0.1, 0],
        },
      });
    }
  };

  useEffect(() => {
    updateLinePositions();
    window.addEventListener("resize", updateLinePositions);
    setTimeout(updateLinePositions, 120);
    return () => window.removeEventListener("resize", updateLinePositions);
  }, [viewport, size]);

  useFrame(() => {
    if (worldRef.current) {
      worldRef.current.position.x = -progressRef.current * SECTION_SPACING;
    }
    frameRef.current += 1;
    if (frameRef.current % 6 === 0) {
      updateLinePositions();
    }
  });

  const heroCircles = [
    { position: [1.9, 1.4, 0], radius: 3.5 },
    { position: [8, -3, 0], radius: 2 },
    { position: [8.5, 3, 0], radius: 0.6 },
    { position: [-6, -4, 0], radius: 0.35 },
    { position: [-4, -2, 0], radius: 0.5 },
    { position: [6.8, 0, 0], radius: 0.65 },
    { position: [-2.2, -2.4, 0], radius: 0.9 },
  ];

  const devopsOffset = SECTION_SPACING;
  const devopsCircles = [
    { position: [devopsOffset + 2.6, 2.8, 0], radius: 2.3, color: "#ffa726" },
    { position: [devopsOffset + 11.6, 2.4, 0], radius: 3.1, color: "#8a4bdb" },
    { position: [devopsOffset + 8.2, -3.2, 0], radius: 2.1, color: "#ff3c16" },
    { position: [devopsOffset + 11.8, -1.5, 0], radius: 0.24, color: "#ff3c16" },
    { position: [devopsOffset + 5.6, -1.2, 0], radius: 0.45, color: "#111" },
  ];

  const comboOffset = SECTION_SPACING * 2;
  const amadeusOffset = SECTION_SPACING * 3;
  const inriaOffset = SECTION_SPACING * 4;
  const servicesOffset = SECTION_SPACING * 5;
  const keepOffset = SECTION_SPACING * 6;
  const creativeOffset = SECTION_SPACING * 7;
  const philosophyOffset = SECTION_SPACING * 8;
  const galleryOffset = SECTION_SPACING * 9;
  const aerialOffset = SECTION_SPACING * 9;

  const extraCircles = [
    { position: [comboOffset + 7.0, 4.2, 0], radius: 2.0, color: "#9bb8c9" },
    { position: [comboOffset + 7.8, -2.4, 0], radius: 1.8, color: "#111" },
    { position: [amadeusOffset + 6.8, -2.4, 0], radius: 1.8, color: "#ff3c16" },
    { position: [amadeusOffset + 4.2, 2.6, 0], radius: 2.2, color: "#ffa726" },
    { position: [inriaOffset + 4.8, 2.4, 0], radius: 2.6, color: "#c661d5" },
    { position: [servicesOffset + 2.2, 3.8, 0], radius: 2.4, color: "#6da3c2" },
    // { position: [servicesOffset + 6.2, -2.2, 0], radius: 2.2, color: "#111" },
    // { position: [servicesOffset + 9.8, 1.6, 0], radius: 1.6, color: "#ff3c16" },
    { position: [servicesOffset + 0.8, -2.4, 0], radius: 1.0, color: "#ffa726" },
    { position: [servicesOffset + 7.1, -4.2, 0], radius: 2.2, color: "#9b59b6" },
    { position: [aerialOffset + 4.8, 2.6, 0], radius: 2.2, color: "#ff3c16" },
    { position: [aerialOffset + 1.6, -2.6, 0], radius: 1.8, color: "#ffa726" },
    { position: [aerialOffset + 8.4, -1.6, 0], radius: 1.4, color: "#9bb8c9" },
    { position: [creativeOffset + 6.2, 2.8, 0], radius: 2.8, color: "#ff3c16" },
  ];

  const allColliders = [
    ...heroCircles.map((c) => ({ position: c.position, radius: c.radius })),
    ...devopsCircles.map((c) => ({ position: c.position, radius: c.radius })),
    ...extraCircles.map((c) => ({ position: c.position, radius: c.radius })),
  ];

  return (
    <group ref={worldRef}>
      {heroCircles.map((circle, idx) => (
        <ElasticCircle
          key={`hero-${idx}`}
          position={circle.position}
          radius={circle.radius}
          color="#111"
          pointerEnabled={pointerEnabled}
        />
      ))}

      {devopsCircles.map((circle, idx) => (
        <ElasticCircle
          key={`devops-${idx}`}
          position={circle.position}
          radius={circle.radius}
          color={circle.color}
          pointerEnabled={pointerEnabled}
        />
      ))}

      {extraCircles.map((circle, idx) => (
        <ElasticCircle
          key={`extra-${idx}`}
          position={circle.position}
          radius={circle.radius}
          color={circle.color}
          pointerEnabled={pointerEnabled}
        />
      ))}

      <WobbleShape position={[amadeusOffset + 9.6, 2.6, 0]}>
        <mesh rotation={[0, 0, 0.8]}>
          <coneGeometry args={[1.6, 1.8, 3]} />
          <meshBasicMaterial color="#ff3c16" />
        </mesh>
      </WobbleShape>

      <WobbleShape position={[keepOffset + 2.6, -2.8, 0]}>
        <mesh rotation={[0, 0, 0.35]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial color="#9bb8c9" />
        </mesh>
      </WobbleShape>

      <WobbleShape position={[keepOffset + 4.8, 3.2, 0]}>
        <mesh rotation={[0, 0, -0.45]}>
          <coneGeometry args={[2.6, 2.8, 3]} />
          <meshBasicMaterial color="#e9a7c8" />
        </mesh>
      </WobbleShape>

      <WobbleShape position={[creativeOffset + 2.4, -2.4, 0]}>
        <mesh rotation={[0, 0, -0.3]}>
          <coneGeometry args={[2, 2.2, 3]} />
          <meshBasicMaterial color="#9b59b6" />
        </mesh>
      </WobbleShape>

      <ThickLine
        start={linePositions.line1.start}
        end={linePositions.line1.end}
        color="white"
        thickness={0.07}
        pointerEnabled={pointerEnabled}
      />
      <ThickLine
        start={linePositions.line2.start}
        end={linePositions.line2.end}
        color="white"
        thickness={0.07}
        pointerEnabled={pointerEnabled}
      />

      <ParticleSystem circles={allColliders} />
    </group>
  );
}

function WiggleTitle({ textLines, emphasis = false, overlap = false, className = "" }) {
  const fullText = textLines.join(" ");
  const [colors, setColors] = useState(() =>
    fullText.split("").map(() => "#fff")
  );
  const intervalRef = useRef(null);
  const palette = ["#ff3c16", "#ffa726", "#8a4bdb", "#f4b1ff", "#ffffff"];

  const startShuffle = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setColors((prev) =>
        prev.map(() => palette[Math.floor(Math.random() * palette.length)])
      );
    }, 180);
  };

  const stopShuffle = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setColors(fullText.split("").map(() => "#fff"));
  };

  useEffect(() => () => stopShuffle(), [fullText]);

  let cursor = 0;
  return (
    <div
      className={`title-stack ${overlap ? "title-stack--overlap" : ""} ${className}`}
      onMouseEnter={startShuffle}
      onMouseLeave={stopShuffle}
    >
      {textLines.map((line, lineIdx) => (
        <div
          key={`line-${lineIdx}`}
          className={`title-block ${emphasis && lineIdx === 1 ? "title-block--big" : ""}`}
        >
          <div className="title-line">
            {line.split("").map((char, idx) => {
              const color = colors[cursor];
              cursor += 1;
              return (
                <span
                  key={`${lineIdx}-${idx}`}
                  style={{ color }}
                  className="title-letter"
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function KeepScroll({ pointerEnabled = true }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const particlesRef = useRef([]);
  const bounceRef = useRef(0);
  const letterBounceRef = useRef([]);
  const spawnTimer = useRef(0);
  const frameRef = useRef(0);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    let width = wrap.clientWidth;
    let height = wrap.clientHeight;

    const resize = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const onMove = (e) => {
      if (!pointerEnabled) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const onLeave = () => {
      mouseRef.current.active = false;
    };

    if (pointerEnabled) {
      canvas.addEventListener("mousemove", onMove);
      canvas.addEventListener("mouseleave", onLeave);
    }

    const colors = ["#ff3c16", "#ffa726", "#8a4bdb", "#f4b1ff", "#9bb8c9"];
    const centerX = () => width / 2;
    const centerY = () => height / 2;
    const radius = () => Math.min(width, height) * 0.46;

    const spawnParticle = () => {
      const R = radius();
      return {
        x: centerX() + (Math.random() - 0.5) * R * 1.4,
        y: centerY() - R - 80 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 1.2,
        vy: Math.random() * 0.5,
        r: 16 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobble: Math.random() * Math.PI * 2,
      };
    };

    particlesRef.current = Array.from({ length: 10 }).map(() => spawnParticle());

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      frameRef.current += 1;

      const cx = centerX();
      const cy = centerY();
      const R = radius();

      const text = "Keep scroooooolling";
      const fontSize = Math.max(28, Math.min(62, width * 0.12));
      ctx.font = `${fontSize}px Neue Machina, Space Grotesk, sans-serif`;
      const textMetrics = ctx.measureText(text);
      const textW = textMetrics.width;
      const textH = fontSize * 0.9;
      const textX = cx - textW / 2;
      const textY = cy + textH / 2 + bounceRef.current;
      const textRect = {
        x: textX - 10,
        y: textY - textH,
        w: textW + 20,
        h: textH + 10,
      };

      if (letterBounceRef.current.length !== text.length) {
        letterBounceRef.current = Array.from({ length: text.length }).map(() => 0);
      }

      const letterWidths = [];
      for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        letterWidths.push(ctx.measureText(char).width);
      }
      const letterPositions = [];
      let cursorX = textX;
      for (let i = 0; i < text.length; i += 1) {
        letterPositions.push(cursorX);
        cursorX += letterWidths[i];
      }

      spawnTimer.current += 1;
      if (spawnTimer.current % 6 === 0 && particlesRef.current.length < 16) {
        particlesRef.current.push(spawnParticle());
      }

      particlesRef.current.forEach((p) => {
        p.vy += 0.4;
        p.wobble += 0.04;
        p.vx += Math.sin(p.wobble) * 0.02;

        if (mouseRef.current.active) {
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;
          const mdx = p.x - mx;
          const mdy = p.y - my;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 90) {
            const strength = (1 - mDist / 90) * 1.6;
            p.vx += (mdx / (mDist || 1)) * strength;
            p.vy += (mdy / (mDist || 1)) * strength;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist + p.r > R) {
          const nx = dx / dist;
          const ny = dy / dist;
          // Let particles fall out through the bottom
          if (ny < 0 || Math.abs(nx) > 0.2) {
            p.x = cx + nx * (R - p.r);
            p.y = cy + ny * (R - p.r);
            const dot = p.vx * nx + p.vy * ny;
            p.vx -= 2 * dot * nx;
            p.vy -= 2 * dot * ny;
            p.vx *= 0.78;
            p.vy *= 0.78;
          }
        }

        if (
          p.x + p.r > textRect.x &&
          p.x - p.r < textRect.x + textRect.w &&
          p.y + p.r > textRect.y &&
          p.y - p.r < textRect.y + textRect.h
        ) {
          p.vy *= -0.72;
          p.vx += (Math.random() - 0.5) * 0.6;
          bounceRef.current = -18;
          const hitX = p.x - textX;
          let idx = 0;
          let acc = 0;
          for (let i = 0; i < letterWidths.length; i += 1) {
            acc += letterWidths[i];
            if (hitX <= acc) {
              idx = i;
              break;
            }
          }
          letterBounceRef.current[idx] = -10;
        }

        if (p.y - p.r > cy + R + 80) {
          Object.assign(p, spawnParticle());
        }

        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${Math.max(20, fontSize * 0.45)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#111";
        ctx.fillText("👀", p.x, p.y + 1);
      });

      bounceRef.current *= 0.78;
      letterBounceRef.current = letterBounceRef.current.map((b) => b * 0.8);

      ctx.fillStyle = "#fff";
      ctx.textBaseline = "middle";
      for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const lx = letterPositions[i];
        const offset = letterBounceRef.current[i] || 0;
        ctx.fillText(char, lx, cy + offset + bounceRef.current);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="keep-circle elastic-ui" ref={wrapRef}>
      <canvas ref={canvasRef} className="keep-canvas" />
    </div>
  );
}

function VideoThumb({ src, previewSrc, poster, className, onOpen, span = 24 }) {
  const videoRef = useRef(null);

  const handleEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const p = videoRef.current.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };

  const handleLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <button
      className={`video-tile elastic-ui clickable ${className}`}
      type="button"
      onClick={() => onOpen(src)}
      onMouseEnter={previewSrc ? handleEnter : undefined}
      onMouseLeave={previewSrc ? handleLeave : undefined}
      style={{ backgroundImage: `url(${poster})`, gridRowEnd: `span ${span}` }}
    >
      <span className="tile-play-icon" aria-hidden="true">
        ▶
      </span>
      {previewSrc && (
        <video ref={videoRef} src={previewSrc} muted loop playsInline preload="metadata" poster={poster} />
      )}
    </button>
  );
}

export default function App() {
  const elevenlabsAgentId =
    import.meta.env.VITE_ELEVENLABS_AGENT_ID ||
    "agent_9701kmebn7e5fjz9p2fp59zjg2fc";
  const [progress, setProgress] = useState(0);
  const targetRef = useRef(0);
  const progressRef = useRef(0);
  const [showReelOpen, setShowReelOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMode, setAiMode] = useState("idle");
  const [aiMuted, setAiMuted] = useState(false);
  const [aiSeconds, setAiSeconds] = useState(0);
  const [aiStatus, setAiStatus] = useState("disconnected");
  const [aiError, setAiError] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiUserSpeaking, setAiUserSpeaking] = useState(false);
  const aiTranscriptRef = useRef(null);
  const aiMicStreamRef = useRef(null);
  const aiStartingRef = useRef(false);
  const [activeVideo, setActiveVideo] = useState({ type: "youtube", url: "https://youtu.be/jFGiBOBfENY" });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  const conversation = useConversation({
    onConnect: () => {
      setAiStatus("connected");
      setAiError("");
    },
    onDisconnect: () => {
      setAiStatus("disconnected");
      setAiMode("idle");
      setAiSeconds(0);
      setAiUserSpeaking(false);
    },
    onStatusChange: ({ status }) => {
      if (status) setAiStatus(status);
    },
    onModeChange: ({ mode }) => {
      if (mode === "speaking") {
        setAiUserSpeaking(false);
        setAiMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev;
          return [...prev, { role: "assistant", text: "…", streaming: true }];
        });
      }
    },
    onMessage: ({ source, message }) => {
      const text = String(message || "").replace(/\[[^\]]+\]\s*/g, "").trim();
      if (!text) return;
      const role = source === "user" ? "user" : "assistant";
      if (role === "user") {
        setAiUserSpeaking(false);
        setAiMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "user" && last?.text === text) return prev;
          return [...prev, { role: "user", text }];
        });
        return;
      }
      setAiMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last?.streaming) {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", text };
          return next;
        }
        if (last?.role === "assistant" && last?.text === text) return prev;
        return [...prev, { role: "assistant", text }];
      });
    },
    onDebug: (debugEvent) => {
      if (debugEvent?.type !== "tentative_agent_response") return;
      const text = String(debugEvent.response || "").replace(/\[[^\]]+\]\s*/g, "").trim();
      if (!text) return;
      setAiMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last?.streaming) {
          if (last.text === text) return prev;
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", text, streaming: true };
          return next;
        }
        return [...prev, { role: "assistant", text, streaming: true }];
      });
    },
    onVadScore: ({ vadScore }) => {
      setAiUserSpeaking(vadScore > 0.4);
    },
    onError: (error) => {
      const msg = typeof error === "string" ? error : error?.message || "AI connection error";
      setAiError(msg);
    },
  });

  useEffect(() => {
    if (aiStatus !== "connected") return;
    conversation.setMicMuted?.(aiMuted);
  }, [aiMuted, aiStatus, conversation]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.toggle("is-mobile", isMobile);
    body.classList.toggle("is-mobile", isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (aiMode !== "call") return;
    const timer = setInterval(() => setAiSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [aiMode]);

  useEffect(() => {
    if (showAiModal) return;
    if (aiStatus === "connected" || aiStatus === "connecting") {
      conversation.endSession();
    }
    setAiMode("idle");
    setAiSeconds(0);
    setAiMuted(false);
  }, [showAiModal, aiStatus, conversation]);

  useEffect(() => {
    if (!showAiModal) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // Pre-warm microphone permission to reduce first-response lag on "Start the Call".
    if (!aiMicStreamRef.current) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          aiMicStreamRef.current = stream;
        })
        .catch(() => {
          // Ignore here; we surface explicit errors on call start.
        });
    }

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;

      if (aiMicStreamRef.current) {
        aiMicStreamRef.current.getTracks().forEach((t) => t.stop());
        aiMicStreamRef.current = null;
      }
    };
  }, [showAiModal]);

  useEffect(() => {
    if (!aiTranscriptRef.current) return;
    aiTranscriptRef.current.scrollTop = aiTranscriptRef.current.scrollHeight;
  }, [aiMessages, aiMode]);


  useEffect(() => {
    const onMove = (e) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = (e.clientY / window.innerHeight) * 2 - 1;
      document.documentElement.style.setProperty("--mx", mx.toFixed(3));
      document.documentElement.style.setProperty("--my", my.toFixed(3));
    };
    window.addEventListener("pointermove", onMove);

    let raf;
    const tick = () => {
      progressRef.current = THREE.MathUtils.lerp(
        progressRef.current,
        targetRef.current,
        0.08
      );
      setProgress(progressRef.current);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (showAiModal) return;
    if (isMobile) {
      const onScroll = () => {
        const virtualProgress = window.scrollY / window.innerHeight;
        targetRef.current = clamp(virtualProgress, 0, MAX_SECTIONS);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => {
        window.removeEventListener("scroll", onScroll);
      };
    }
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.0025;
      targetRef.current = clamp(targetRef.current + delta, 0, MAX_SECTIONS);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [isMobile, showAiModal]);

  const tightForegroundCount = TIGHT_FOREGROUND_COUNT;
  const tightBackgroundCount = TIGHT_BACKGROUND_COUNT;

  const foregroundSections = (
    <>
      <section className="screen hero-screen">
          <div className="hero-text">
            <h1 id="kartik-text">KARTIK</h1>
            <h1 id="ajrot-text">AJROT</h1>
            <p className="hero-tagline">
              CREATIVE CLOUD ENGINEER
              <br />
              BASED IN BERLIN
            </p>
          </div>

          <div className="hero-footer">
            <button
              className="ai-cta clickable"
              type="button"
              onClick={() => setShowAiModal(true)}
            >
              Talk to my AI <span className="ai-beta-badge">Beta</span>
            </button>
          </div>


      </section>

      <section className="screen devops-screen">
          <div className="devops-band">
            <div className="band-title">PROFESSIONAL EXPERIENCE</div>
            <div className="band-title">(and some Personal Bits)</div>
            <div className="band-sub">2018 - Present</div>
            <div className="band-footer">
              <span>Work , About</span>
            </div>
          </div>
          <div className="devops-main">
            <WiggleTitle textLines={["DevOps"]} emphasis />
            <WiggleTitle textLines={["Engineer"]} emphasis />
            <div className="devops-tagline">
              8+ years architecting cloud platforms, infrastructure strategy, and reliability.
              Expert in Kubernetes at scale, GitOps automation, and security-first architecture.
            </div>
          </div>
          
      </section>

      <section className="screen simple-screen combo-screen">
          <div className="screen-card elastic-ui competencies-card">
            <h2>Core Competencies</h2>
            <div className="competency-grid">
              <div>
                <h3>Cloud & Infrastructure</h3>
                <p>Kubernetes (AKS, EKS), Terraform, AWS, Azure, GCP, Hybrid Cloud, VPC/vWAN Design, DNS, Secret Management, RBAC, Bare-metal Operations, Linux Administration</p>
              </div>
              <div>
                <h3>Containers & Platform</h3>
                <p>GitOps (FluxCD, ArgoCD), Docker, Helm, Karpenter, Kyverno, KEDA, Knative, Istio, Kamaji, vCluster, CRD Development</p>
              </div>
              <div>
                <h3>CI/CD & Automation</h3>
                <p>Jenkins, Github Actions, GitLab CI, Azure DevOps, Self-Hosted Runners (Linux/macOS), Python, Go</p>
              </div>
              <div>
                <h3>Observability & SRE</h3>
                <p>Prometheus, Grafana, Datadog, ELK/EFK, Elasticsearch, Loki, Thanos, OpenSearch, SLI/SLO Definition, Burn-rate Alerting</p>
              </div>
              <div>
                <h3>Security & Identity</h3>
                <p>Keycloak, Auth0, Microsoft Entra, OAuth2/OIDC, Kyverno Policy-as-Code, IAM/RBAC, Snyk, SonarQube, Falco, PCI-DSS, ISO 27001, SOC 2</p>
              </div>
            </div>
          </div>

          <div className="screen-card elastic-ui dense-card akelius-card">
            <h2>Akelius</h2>
            <p>DevOps Specialist</p>
            <p className="date-line">October 2021 - Present · Berlin, Germany</p>
            <div className="dense-block">
              <h3>Platform Vision & Architecture</h3>
              <ul>
                <li>Defined and owned Kubernetes platform strategy across 22 AKS/EKS clusters: lifecycle, upgrades, node pools, ingress, Kong, CoreDNS, Fluent Bit, cert-manager, Kyverno, and KEDA; enabled 40+ engineers and reduced onboarding from 2 weeks to 2 days.</li>
                <li>Led AWS → Azure consolidation across 62 applications with zero downtime, reducing annual cloud spend by 39% (€271k) after securing C-level buy-in.</li>
                <li>Designed multi-cloud Terraform foundations for networking, IAM governance, and security patterns adopted across AWS and Azure.</li>
                <li>Standardized self-service GitOps using FluxCD and Kustomize base/overlay patterns, reducing release lead time by 60%.</li>
                <li>Led Auth0 → Keycloak migration end-to-end (PoC to rollout), reshaping identity architecture and zero-trust adoption.</li>
                <li>Defined AI infra roadmap: deployed KubeAI + vLLM endpoints (Llama/Mistral) for 800 users, supporting analytics across 20K+ residential units.</li>
              </ul>
            </div>
            <div className="dense-block">
              <h3>Observability & Platform Engineering Excellence</h3>
              <ul>
                <li>Architected observability stack from scratch (Prometheus, Grafana, Datadog, ELK, DCGM exporter), defined SLIs/SLOs, and added burn-rate alerting; reduced alert noise by 70% and MTTR by 45%.</li>
                <li>Led org-wide GitOps adoption after FluxCD vs ArgoCD evaluation; made GitOps default across 22 clusters.</li>
                <li>Consolidated CI/CD into centralized Jenkins with self-hosted Linux/macOS runners and integrated Snyk + SonarQube for 50+ production deployments/week.</li>
              </ul>
            </div>
            <div className="dense-block">
              <h3>Team Leadership & Developer Experience</h3>
              <ul>
                <li>Led platform engineers with direct line management and production pairing; grew junior engineers to mid-level with zero voluntary attrition.</li>
                <li>Established platform standards across 9 development teams for GitOps, security, observability, and CI/CD.</li>
                <li>Applied product mindset to platform roadmap using developer interviews and adoption-impact prioritization.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="screen simple-screen">
          <div className="stacked-card">
            <div className="screen-card elastic-ui">
              <h2>Amadeus Software Labs</h2>
              <p>Senior Software Engineer – DevOps</p>
              <p className="date-line">April 2020 – September 2021 · Bangalore, India</p>
              <ul>
                <li>Led migration of large-scale Java systems to cloud-native OpenShift, defining strategy and cutover for 15+ high-traffic services and improving scalability by 3x.</li>
                <li>Designed and operated a Managed Apache platform with Kubernetes Operators (Golang), automating deployment/scaling for 200+ instances across 5 regions and reducing manual effort by 80%.</li>
                <li>Served as Scrum Master for 3 cross-functional teams, improving delivery predictability by 40% and reducing cycle time.</li>
              </ul>
            </div>
            <div className="screen-card elastic-ui stacked-overlap">
              <h2>Amadeus Software Labs</h2>
              <p>Software Engineer</p>
              <p className="date-line">January 2018 – March 2020 · Bangalore, India</p>
              <ul>
                <li>Developed backend services and automation frameworks in Python and Java for distributed systems.</li>
                <li>Upgraded Apache/JBoss servers across production fleet to meet PCI-DSS compliance requirements.</li>
                <li>Participated in on-call rotations for high-traffic systems handling 10M+ daily transactions with 99.99% uptime.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="screen simple-screen">
          <div className="stacked-card">
            <div className="screen-card elastic-ui">
              <h2>Inria</h2>
              <p>Research Intern, Sophia Antipolis, France</p>
              <ul>
                <li>Built computer vision models for Alzheimer’s patient activity recognition using kinetic sensor data.</li>
                <li>Focused on sequence modeling and sensor fusion for real-world activity detection.</li>
              </ul>
            </div>
            <div className="screen-card elastic-ui stacked-overlap">
              <h2>PEC University</h2>
              <p>Bachelor of Technology · Electronics & Communication</p>
              <p className="date-line">CGPA 8.14 · Chandigarh</p>
            </div>
          </div>
        </section>

        <section className="screen services-screen screen-tight">
          <div className="services-wrap">
            <div className="services-title-wrap">
              <WiggleTitle textLines={["Cloud & Platform"]} overlap className="services-title services-title--split" />
              <WiggleTitle textLines={["Services"]} overlap className="services-title services-title--split" />
              
            </div>
            <p>Infrastructure-agnostic · AWS · Azure · GCP</p>
            <div className="services-cards-wrap">
              <div className="services-grid services-grid--stagger">
                <div className="service-card">
                  <span className="service-pill">FOUNDATION</span>
                  <h3>Zero to Production</h3>
                  <p>For startups and teams starting from scratch — production-ready infra without hiring a full platform team.</p>
                  <ul>
                    <li>Cloud architecture design & setup</li>
                    <li>Kubernetes cluster provisioning</li>
                    <li>CI/CD pipeline configuration</li>
                    <li>Infrastructure-as-Code (Terraform/Pulumi)</li>
                    <li>Basic observability — monitoring, logging, alerting</li>
                    <li>Security baseline & access management</li>
                    <li>AI infra — HPC, AWS ParallelCluster, KubeRay, batch schedulers, Kubeflow</li>
                  </ul>
                </div>
                <div className="service-card service-card--highlight">
                  <span className="service-pill">GROWTH</span>
                  <h3>Optimize & Scale</h3>
                  <p>Already running in the cloud but it’s messy, expensive, or fragile? I’ll audit, fix, and future-proof.</p>
                  <ul>
                    <li>Infrastructure audit & health check</li>
                    <li>Cloud cost optimization (FinOps)</li>
                    <li>Cloud migration — AWS ↔ Azure ↔ GCP</li>
                    <li>GitOps implementation (ArgoCD / Flux)</li>
                    <li>Policy-as-Code governance (Kyverno / OPA)</li>
                    <li>Advanced observability & incident response</li>
                    <li>Multi-cluster & multi-cloud architecture</li>
                  </ul>
                </div>
                <div className="service-card">
                  <span className="service-pill">ADVISORY</span>
                  <h3>Fractional Platform Engineer</h3>
                  <p>Ongoing, retainer-based support — senior platform engineering without the full-time cost.</p>
                  <ul>
                    <li>Monthly architecture reviews</li>
                    <li>On-call incident support & guidance</li>
                    <li>Team mentoring & best practice workshops</li>
                    <li>Vendor evaluation & tech stack decisions</li>
                    <li>Strategic infrastructure roadmap planning</li>
                  </ul>
                </div>
              </div>
              <a
                className="calendar-button clickable services-cta"
                href="https://calendar.google.com/calendar/appointments/schedules/AcZssZ0v3H2ea4kuYqntwftlNjDElberk-FqcbHpwX9ArmLpz6L-L1Iy6pPqO6x76CQMibkka59bTkIE?gv=true"
                target="_blank"
                rel="noreferrer"
              >
                Let’s Talk →
              </a>
            </div>
          </div>
        </section>

        <section className="screen keep-screen screen-tight">
          <KeepScroll pointerEnabled={!isMobile} />
        </section>

        <section className="screen creative-screen screen-tight">
          <div className="creative-block">
            <WiggleTitle textLines={["Creative", "Human"]} emphasis overlap className="creative-title" />
            <button
              className="showreel-hero elastic-ui clickable"
              onClick={() => {
                setActiveVideo({ type: "youtube", url: "https://youtu.be/jFGiBOBfENY" });
                setShowReelOpen(true);
              }}
              type="button"
            >
              <span className="play-icon">▶</span>
              Showreel
            </button>
          </div>
        </section>
        <section className="screen simple-screen">
          <div className="stacked-card">
            <div className="screen-card elastic-ui">
              <h2>Life Philosophy</h2>
              <p>
                I don’t believe in a single niche. I believe in being human — in touching
                many worlds,<br /> loving many things, and letting experience shape me. I’m
                drawn to creating my own culture instead of buying everything society
                sells,<br /> and I try to stay honest about the fact that we’re all constant
                works in progress.<br />
              </p>
              <p>
                Life, to me, is not a straight line.<br /> It’s a collage — of movement,
                curiosity, craft, and care. <br />The more I explore, the more I understand
                how much there is left to become.
              </p>
            </div>

            <div className="screen-card elastic-ui stacked-overlap">
              <h2>Life Outtake</h2>
              <p>
                I love movement — dancing, sports, city walks that end in quiet cafés.<br />
                I love textures — pottery, sound meditation, slow mornings, and the
                rhythm of new hobbies.<br /> I love creating — editing videos, working with
                brands, and shaping ideas into something real.
              </p>
              <p>
                I love cinematography, flying my drone, and the way travel stretches
                my sense of home.<br /> And through it all, I try to grow: as a friend, a
                partner, a son — and as a person still learning how to be here.<br />
              </p>
            </div>
          </div>
        </section>


        <section className="screen gallery-screen">
          <div className="video-layout gallery-grid">
            {[
              { poster: "/images/3.jpg", span: 30, url: "https://youtube.com/shorts/pC4bX057qBo?feature=share" },
              { poster: "/images/2.png", span: 22, url: "https://youtube.com/shorts/uMB6769jVc4?feature=share" },
              { poster: "/images/2.jpg", span: 26, url: "https://youtu.be/ajGh1sRdnwo" },
              { poster: "/images/4.jpg", span: 34, url: "https://youtu.be/PfGdJA2TgmQ" },
              { poster: "/images/6.png", span: 20, url: "https://youtube.com/shorts/wxts8nWmAV4?feature=share" },
              { poster: "/images/7.png", span: 28, url: "https://youtube.com/shorts/AWq4gxgzEvY?feature=share" },
              { poster: "/images/5.png", span: 18, url: "https://youtube.com/shorts/R87ebYV8F5M?feature=share" },
              { poster: "/images/9.png", span: 24, url: "https://youtube.com/shorts/2ku-kRGBMMQ?feature=share" },
              { poster: "/images/10.png", span: 32, url: "https://youtube.com/shorts/RM1ItFUzC_A?feature=share" },
              { poster: "/images/11.png", span: 20, url: "https://youtube.com/shorts/WCqVEbqxoqw?feature=share" },
              { poster: "/images/16.png", span: 26, url: "https://youtube.com/shorts/zCNo1mjsqio?feature=share" },
              { poster: "/images/15.png", span: 30, url: "https://youtube.com/shorts/VsMo7yXKEYA?feature=share" },
            ].map((item) => (
              <VideoThumb
                key={item.poster}
                poster={item.poster}
                span={item.span}
                src={item.url}
                onOpen={(src) => {
                  setActiveVideo({ type: "youtube", url: src });
                  setShowReelOpen(true);
                }}
              />
            ))}
          </div>
        </section>

        <section className="screen services-screen aerial-screen">
          <div className="services-wrap">
            <div className="services-title-wrap">
              <WiggleTitle textLines={["Aerial & Creative"]} overlap className="services-title services-title--split" />
              <WiggleTitle textLines={[ "Services"]} overlap className="services-title services-title--split" />
              
            </div>
            <p>Drone cinematography · Training · Post-production</p>
            <div className="services-grid services-grid--two services-grid--stagger">
              <div className="service-card2 service-card--warm">
                <span className="service-pill service-pill--warm">CINEMATOGRAPHY</span>
                <h3>Aerial Videography</h3>
                <p>Cinematic drone footage for productions, events, and properties — available for teams or direct bookings.</p>
                <ul>
                  <li>Wedding & event aerial coverage</li>
                  <li>Real estate & property showcases</li>
                  <li>Travel & landscape cinematography</li>
                  <li>Post-production editing & color grading</li>
                  <li>Collaboration with production teams</li>
                </ul>
              </div>
              <div className="service-card2 service-card--warm">
                <span className="service-pill service-pill--warm">TRAINING</span>
                <h3>Learn to Fly & Edit</h3>
                <p>One-on-one or small group sessions covering everything from first flight to pro-grade editing workflows.</p>
                <ul>
                  <li>Drone fundamentals & flight planning</li>
                  <li>Camera settings & shot composition</li>
                  <li>Video editing & post-production workflow</li>
                  <li>Regulations & safety best practices</li>
                  <li>Flexible format — hourly or workshop-based</li>
                </ul>
              </div>
            </div>
            <div className="contact-buttons">
              <a
                className="calendar-button clickable"
                href="https://calendar.google.com/calendar/appointments/schedules/AcZssZ0v3H2ea4kuYqntwftlNjDElberk-FqcbHpwX9ArmLpz6L-L1Iy6pPqO6x76CQMibkka59bTkIE?gv=true"
                target="_blank"
                rel="noreferrer"
              >
                Book an appointment
              </a>
              <a className="calendar-button clickable" href="mailto:ajrot.kartik@gmail.com">Email</a>
              <a className="calendar-button clickable" href="https://www.linkedin.com/in/kartikajrot/" target="_blank" rel="noreferrer">LinkedIn</a>
              <a className="calendar-button clickable" href="https://www.instagram.com/kartikajrot/" target="_blank" rel="noreferrer">Instagram</a>
              <a className="calendar-button clickable" href="https://medium.com/@kartikajrot" target="_blank" rel="noreferrer">Medium</a>
            </div>
          </div>
        </section>
    </>
  );

  const backgroundSections = (
    <>
      <section className="screen hero-screen" />
      <section className="screen devops-screen" />
      <section className="screen simple-screen" />
      <section className="screen simple-screen" />
      <section className="screen simple-screen" />
      <section className="screen services-screen" />
      <section className="screen keep-screen" />
      <section className="screen creative-screen" />
      <section className="screen simple-screen" />
      <section className="screen gallery-screen screen-tight" />
      <section className="screen services-screen screen-tight" />
    </>
  );

  const mobileSections = (
    <>
      <section className="mobile-hero">
        <div className="mobile-hero-text">
          <h1>KARTIK</h1>
          <h1>AJROT</h1>
          <p>CREATIVE CLOUD ENGINEER<br />BASED IN BERLIN</p>
          <div className="mobile-hero-footer">
            <button
              className="ai-cta clickable"
              type="button"
              onClick={() => setShowAiModal(true)}
            >
              Talk to my AI <span className="ai-beta-badge">Beta</span>
            </button>
          </div>
        </div>
      </section>

      <section className="mobile-section mobile-devops">
        <div className="mobile-title-stack mobile-title-stack--aligned">
          <div className="mobile-title">DevOps</div>
          <div className="mobile-title mobile-title--offset">Engineer</div>
        </div>
        <p className="mobile-lede">
          8+ years architecting cloud platforms, infrastructure strategy, and reliability. Expert in Kubernetes at scale,
          GitOps automation, and security-first architecture.
        </p>
      </section>

      <section className="mobile-section">
        <div className="mobile-card">
          <h2>Core Competencies</h2>
          <p><strong>Cloud & Infrastructure:</strong> Kubernetes (AKS, EKS), Terraform, AWS, Azure, GCP, Hybrid Cloud, VPC/vWAN, DNS, Secret Management, RBAC, Bare-metal Operations, Linux Administration</p>
          <p><strong>Containers & Platform:</strong> GitOps (FluxCD, ArgoCD), Docker, Helm, Karpenter, Kyverno, KEDA, Knative, Istio, Kamaji, vCluster, CRD Development</p>
          <p><strong>CI/CD & Automation:</strong> Jenkins, Github Actions, GitLab CI, Azure DevOps, Self-Hosted Runners (Linux/macOS), Python, Go</p>
          <p><strong>Observability & SRE:</strong> Prometheus, Grafana, Datadog, ELK/EFK, Elasticsearch, Loki, Thanos, OpenSearch, SLI/SLO Definition, Burn-rate Alerting</p>
          <p><strong>Security & Identity:</strong> Keycloak, Auth0, Microsoft Entra, OAuth2/OIDC, Kyverno Policy-as-Code, IAM/RBAC, Snyk, SonarQube, Falco, PCI-DSS, ISO 27001, SOC 2</p>
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-card">
          <h2>Akelius · DevOps Specialist</h2>
          <p className="date-line">Oct 2021 – Present · Berlin</p>
          <ul>
            <li>Owned Kubernetes platform strategy across 22 AKS/EKS clusters and internal tooling stack.</li>
            <li>Cut app onboarding from 2 weeks to 2 days while supporting 100K+ users.</li>
            <li>Led AWS → Azure migration across 62 apps with zero downtime and 39% cost reduction.</li>
            <li>Built Terraform multi-cloud foundations and standardized GitOps workflows.</li>
          </ul>
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-card">
          <h2>Amadeus · Senior Software Engineer (DevOps)</h2>
          <p className="date-line">Apr 2020 – Sep 2021 · Bangalore</p>
          <ul>
            <li>Migrated Java systems to OpenShift for resilience.</li>
            <li>Built a managed Apache platform using Kubernetes Operators.</li>
          </ul>
        </div>
        <div className="mobile-card">
          <h2>Amadeus · Software Engineer</h2>
          <p className="date-line">Jan 2018 – Mar 2020 · Bangalore</p>
          <ul>
            <li>Backend services and automation in Python and Java.</li>
            <li>Upgraded Apache/JBOSS to meet PCI-DSS.</li>
          </ul>
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-card">
          <h2>Inria · Research Intern</h2>
          <p>Computer vision for Alzheimer’s activity recognition using kinetic sensors.</p>
        </div>
        <div className="mobile-card">
          <h2>PEC University</h2>
          <p>B.Tech Electronics & Communication · CGPA 8.14 · Chandigarh</p>
        </div>
      </section>

      <section className="mobile-section mobile-services">
        <div className="mobile-title-stack mobile-title-stack--aligned">
          <div className="mobile-title">Cloud & Platform</div>
          <div className="mobile-title mobile-title--offset">Services</div>
        </div>
        <p className="mobile-lede">Infrastructure-agnostic · AWS · Azure · GCP</p>
        <div className="mobile-services-cards">
          <div className="mobile-card">
            <span className="service-pill">FOUNDATION</span>
            <h3>Zero to Production</h3>
            <ul>
              <li>Cloud architecture design & setup</li>
              <li>Kubernetes cluster provisioning</li>
              <li>CI/CD pipeline configuration</li>
              <li>Infrastructure-as-Code (Terraform/Pulumi)</li>
              <li>Security baseline & access management</li>
              <li>AI infra — HPC, ParallelCluster, KubeRay, Kubeflow</li>
            </ul>
          </div>
          <div className="mobile-card">
            <span className="service-pill">GROWTH</span>
            <h3>Optimize & Scale</h3>
            <ul>
              <li>Infrastructure audit & health check</li>
              <li>Cloud cost optimization (FinOps)</li>
              <li>GitOps implementation (ArgoCD/Flux)</li>
              <li>Policy-as-Code governance (Kyverno/OPA)</li>
              <li>Advanced observability & incident response</li>
              <li>Multi-cluster & multi-cloud architecture</li>
            </ul>
          </div>
          <div className="mobile-card">
            <span className="service-pill">ADVISORY</span>
            <h3>Fractional Platform Engineer</h3>
            <ul>
              <li>Monthly architecture reviews</li>
              <li>On-call incident support & guidance</li>
              <li>Team mentoring & best practice workshops</li>
              <li>Vendor evaluation & tech stack decisions</li>
              <li>Strategic infrastructure roadmap planning</li>
            </ul>
          </div>
        </div>
        <a
          className="calendar-button clickable services-cta"
          href="https://calendar.google.com/calendar/appointments/schedules/AcZssZ0v3H2ea4kuYqntwftlNjDElberk-FqcbHpwX9ArmLpz6L-L1Iy6pPqO6x76CQMibkka59bTkIE?gv=true"
          target="_blank"
          rel="noreferrer"
        >
          Let’s Talk →
        </a>
      </section>

      <section className="mobile-section mobile-creative">
        <div className="mobile-title-stack mobile-title-stack--aligned">
          <div className="mobile-title">Creative</div>
          <div className="mobile-title mobile-title--offset">Human</div>
        </div>
        <button
          className="showreel-hero elastic-ui clickable"
          onClick={() => {
            setActiveVideo({ type: "youtube", url: "https://youtu.be/jFGiBOBfENY" });
            setShowReelOpen(true);
          }}
          type="button"
        >
          <span className="play-icon">▶</span>
          Showreel
        </button>
      </section>

      <section className="mobile-section mobile-gallery">
        <div className="mobile-carousel" role="list">
          {[
            { poster: "/images/11.png", url: "https://youtube.com/shorts/pC4bX057qBo?feature=share" },
            { poster: "/images/2.png", url: "https://youtube.com/shorts/uMB6769jVc4?feature=share" },
            { poster: "/images/2.jpg", url: "https://youtu.be/ajGh1sRdnwo" },
            { poster: "/images/4.jpg", url: "https://youtu.be/PfGdJA2TgmQ" },
            { poster: "/images/6.png", url: "https://youtube.com/shorts/wxts8nWmAV4?feature=share" },
            { poster: "/images/7.png", url: "https://youtube.com/shorts/AWq4gxgzEvY?feature=share" },
            { poster: "/images/8.png", url: "https://youtube.com/shorts/R87ebYV8F5M?feature=share" },
            { poster: "/images/9.png", url: "https://youtube.com/shorts/2ku-kRGBMMQ?feature=share" },
            { poster: "/images/10.png", url: "https://youtube.com/shorts/RM1ItFUzC_A?feature=share" },
            { poster: "/images/3.jpg", url: "https://youtube.com/shorts/WCqVEbqxoqw?feature=share" },
            { poster: "/images/16.png", url: "https://youtube.com/shorts/zCNo1mjsqio?feature=share" },
            { poster: "/images/15.png", url: "https://youtube.com/shorts/VsMo7yXKEYA?feature=share" },
          ].map((item) => (
            <button
              key={item.poster}
              className="mobile-carousel-item clickable"
              type="button"
              onClick={() => {
                setActiveVideo({ type: "youtube", url: item.url });
                setShowReelOpen(true);
              }}
              style={{ backgroundImage: `url(${item.poster})` }}
            />
          ))}
        </div>
      </section>

      <section className="mobile-section mobile-aerial">
        <div className="mobile-title-stack mobile-title-stack--aligned">
          <div className="mobile-title">Aerial & Creative</div>
          <div className="mobile-title mobile-title--offset">Services</div>
        </div>
        <p className="mobile-lede">Drone cinematography · Training · Post-production</p>
        <div className="mobile-services-cards">
          <div className="mobile-card">
            <span className="service-pill service-pill--warm">CINEMATOGRAPHY</span>
            <h3>Aerial Videography</h3>
            <p>Wedding/events, real estate, travel, landscape cinematography, and post-production.</p>
          </div>
          <div className="mobile-card">
            <span className="service-pill service-pill--warm">TRAINING</span>
            <h3>Learn to Fly & Edit</h3>
            <p>1:1 or small group training for flight, camera settings, and editing workflows.</p>
          </div>
        </div>
        <div className="contact-buttons">
          <a
            className="calendar-button clickable"
            href="https://calendar.google.com/calendar/appointments/schedules/AcZssZ0v3H2ea4kuYqntwftlNjDElberk-FqcbHpwX9ArmLpz6L-L1Iy6pPqO6x76CQMibkka59bTkIE?gv=true"
            target="_blank"
            rel="noreferrer"
          >
            Book an appointment
          </a>
          <a className="calendar-button clickable" href="mailto:ajrot.kartik@gmail.com">Email</a>
          <a className="calendar-button clickable" href="https://www.linkedin.com/in/kartikajrot/" target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="calendar-button clickable" href="https://www.instagram.com/kartikajrot/" target="_blank" rel="noreferrer">Instagram</a>
          <a className="calendar-button clickable" href="https://medium.com/@kartikajrot" target="_blank" rel="noreferrer">Medium</a>
        </div>
      </section>
    </>
  );

  const reelModal = showReelOpen ? (
    <div className="reel-modal" onClick={() => setShowReelOpen(false)}>
      <div className="reel-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="reel-close"
          type="button"
          onClick={() => setShowReelOpen(false)}
        >
          ✕
        </button>
        {activeVideo?.type === "youtube" ? (
          <iframe
            className="reel-video"
            src={`https://www.youtube.com/embed/${activeVideo.url.split("v=")[1] ?? activeVideo.url.split("/").pop()?.split("?")[0]}?autoplay=1&playsinline=1&loop=1&playlist=${activeVideo.url.split("v=")[1] ?? activeVideo.url.split("/").pop()?.split("?")[0]}`}
            title="Video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            className="reel-video"
            src={activeVideo?.url}
            controls
            autoPlay
            playsInline
          />
        )}
      </div>
    </div>
  ) : null;

  const formatTime = (seconds) => {
    const mm = `${Math.floor(seconds / 60)}`.padStart(2, "0");
    const ss = `${seconds % 60}`.padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const getFriendlyAiError = (errorText) => {
    const text = String(errorText || "").toLowerCase();
    if (
      text.includes("daily call limit") ||
      text.includes("exceeded") ||
      text.includes("limit reached") ||
      text.includes("quota")
    ) {
      return "AI is kaputt for now — I hit today’s voice limit. Please try again a little later.";
    }
    if (text.includes("microphone permission denied")) {
      return "Microphone access is blocked. Please allow microphone access in your browser settings and try again.";
    }
    if (text.includes("websocket") || text.includes("peer connection")) {
      return "AI call line dropped — please retry in a few seconds.";
    }
    if (text.includes("unable to connect voice session")) {
      return "AI is taking a quick coffee break. Voice is unavailable right now, please retry shortly.";
    }
    return errorText;
  };

  const handleAiChip = async (text) => {
    setAiInput(text);
    await sendAiMessage(text);
    setAiInput("");
  };

  const sendAiMessage = async (overrideText) => {
    const q = (overrideText ?? aiInput).trim();
    if (!q) return;
    setAiMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: "…", streaming: true },
    ]);
    if (!overrideText) setAiInput("");
    try {
      conversation.sendUserMessage(q);
    } catch (error) {
      setAiError(error?.message || "Failed to send message.");
    }
  };

  const startAiCall = async () => {
    if (aiStartingRef.current || aiStatus === "connecting" || aiStatus === "connected") {
      return;
    }
    if (!elevenlabsAgentId) {
      setAiError("Missing ElevenLabs agent id.");
      return;
    }
    aiStartingRef.current = true;
    setAiError("");
    setAiStatus("connecting");
    setAiSeconds(0);
    setAiMuted(false);
    setAiMessages([]);
    try {
      if (!aiMicStreamRef.current) {
        aiMicStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      await conversation.startSession({
        agentId: elevenlabsAgentId,
      });
      setAiMode("call");
    } catch (error) {
      setAiMode("idle");
      const rawMessage = error?.message || "Unable to connect voice session.";
      if (/notallowederror|permission denied|permission dismissed/i.test(rawMessage)) {
        setAiError("Microphone permission denied. Please allow mic access and retry.");
      } else {
        setAiError(rawMessage);
      }
    } finally {
      aiStartingRef.current = false;
    }
  };

  const endAiCall = async () => {
    try {
      await conversation.endSession();
    } catch (_) {}
    setAiMode("idle");
    setAiSeconds(0);
    setAiMuted(false);
    setAiMessages([]);
  };

  const aiModal = showAiModal ? (
    <div className="ai-modal" onClick={() => setShowAiModal(false)}>
      <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="ai-close"
          type="button"
          onClick={() => setShowAiModal(false)}
        >
          Close
        </button>
        <div className="ai-left">
          <img
            className="ai-avatar"
            src="/images/ai-profile.png"
            alt="Kartik Ajrot"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/images/111.png";
            }}
          />
          <h3>Kartik Ajrot <span className="ai-beta-badge">Beta</span></h3>
          <p>Trust me I sound like my AI</p>
          <small>Beta — limited minutes available. Powered by AI. Responses may be imperfect.</small>
        </div>
        <div className="ai-right">
          <div className={`ai-right-inner ${aiMode !== "idle" ? "ai-right-inner--active" : ""}`}>
            <div className="ai-call-top">
              <span>{aiMode === "call" ? formatTime(aiSeconds) : "00:00"}</span>
              {aiMode !== "idle" ? <span>{aiStatus}</span> : null}
              <span>5:00 max</span>
            </div>
            {aiMode === "call" && (
              <div className="ai-call-state">
                <span>{conversation.isSpeaking ? "AI speaking…" : aiUserSpeaking ? "Hearing you…" : "Listening…"}</span>
              </div>
            )}
            {aiMode === "idle" ? (
              <>
                <p className="ai-intro">
                  Hey! I am Kartik. You are on my portfolio right now. Ask about my work,
                  DevOps projects, cloud platform services, creative work, or just chat.
                </p>
                <div className="ai-actions">
                  <button
                    className="ai-btn ai-btn--primary"
                    type="button"
                    onClick={() => void startAiCall()}
                  >
                    Start the Call
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ai-suggestions">
                  <button
                    type="button"
                    className="ai-chip"
                    onClick={() => void handleAiChip("Explain Akelius work")}
                  >
                    Explain Akelius work
                  </button>
                  <button
                    type="button"
                    className="ai-chip"
                    onClick={() => void handleAiChip("What are you working on?")}
                  >
                    What are you working on?
                  </button>
                  <button
                    type="button"
                    className="ai-chip"
                    onClick={() => void handleAiChip("Cloud stack overview")}
                  >
                    Cloud stack overview
                  </button>
                </div>
                <div className="ai-transcript" ref={aiTranscriptRef}>
                  {aiMessages.map((m, i) => (
                    <div key={`${m.role}-${i}`} className={`ai-msg ai-msg--${m.role}${m.streaming ? " ai-msg--streaming" : ""}`}>
                      {m.text}
                    </div>
                  ))}
                </div>
                <div className="ai-input-row">
                  <input
                    className="ai-input"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void sendAiMessage();
                    }}
                    placeholder="Ask me anything about my work..."
                  />
                  <button
                    className="ai-btn ai-btn--send"
                    type="button"
                    onClick={() => void sendAiMessage()}
                  >
                    Send
                  </button>
                </div>
                <div className="ai-call-controls">
                  {aiMode === "call" ? (
                    <button
                      className="ai-btn"
                      type="button"
                      onClick={() => {
                        setAiMuted((v) => !v);
                      }}
                    >
                      {aiMuted ? "Unmute" : "Mute"}
                    </button>
                  ) : null}
                  <button className="ai-btn ai-btn--danger" type="button" onClick={() => void endAiCall()}>
                    End Call
                  </button>
                </div>
              </>
            )}
            {aiError && <div className="ai-error">{getFriendlyAiError(aiError)}</div>}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <div className="mobile-page">
        <Canvas
          className="mobile-canvas"
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{ antialias: true }}
        >
          <Scene progressRef={progressRef} pointerEnabled={false} />
        </Canvas>
        <div className="mobile-sections">{mobileSections}</div>
        {reelModal}
        {aiModal}
      </div>
    );
  }

  return (
    <div className="world">
      <div
        className="world-track background-track"
        style={{
          transform: `translateX(${-progress * 100}vw)`,
          width: `${TOTAL_BACKGROUND_WIDTH}vw`,
        }}
      >
        {backgroundSections}
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ antialias: true }}>
        <Scene progressRef={progressRef} pointerEnabled />
      </Canvas>

      <div
        className="world-track foreground-track"
        style={{
          transform: `translateX(${-progress * 100}vw)`,
          width: `${TOTAL_FOREGROUND_WIDTH}vw`,
        }}
      >
        {foregroundSections}
      </div>

      {reelModal}
      {aiModal}
    </div>
  );
}
