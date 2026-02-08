import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import "./App.css";

const SECTION_SPACING = 12;
const SECTIONS = [
  "hero",
  "devops",
  "competencies",
  "akelius",
  "amadeus",
  "inria-pec",
  "keep",
  "creative",
  "philosophy",
  "gallery",
  "contact",
];
const MAX_SECTIONS = SECTIONS.length - 1;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ElasticCircle({ position, radius, segments = 64, color = "#111" }) {
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

function ThickLine({ start, end, segments = 32, color = "white", thickness = 0.05 }) {
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

function Scene({ progressRef }) {
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
    { position: [1.9, 1.4, 0], radius: 3.6 },
    { position: [8, -3, 0], radius: 2 },
    { position: [8.5, 3, 0], radius: 0.6 },
    { position: [-6, -4, 0], radius: 0.35 },
    { position: [-4, -2, 0], radius: 0.5 },
    { position: [6.8, 0, 0], radius: 0.65 },
  ];

  const devopsOffset = SECTION_SPACING;
  const devopsCircles = [
    { position: [devopsOffset + 2.6, 2.8, 0], radius: 2.3, color: "#ffa726" },
    { position: [devopsOffset + 11.6, 2.4, 0], radius: 3.1, color: "#8a4bdb" },
    { position: [devopsOffset + 8.2, -3.2, 0], radius: 2.1, color: "#ff3c16" },
    { position: [devopsOffset + 11.8, -1.5, 0], radius: 0.24, color: "#ff3c16" },
    { position: [devopsOffset + 5.6, -1.2, 0], radius: 0.45, color: "#111" },
  ];

  const competenciesOffset = SECTION_SPACING * 2;
  const akeliusOffset = SECTION_SPACING * 3;
  const amadeusOffset = SECTION_SPACING * 4;
  const inriaOffset = SECTION_SPACING * 5;
  const keepOffset = SECTION_SPACING * 6;
  const creativeOffset = SECTION_SPACING * 7;
  const philosophyOffset = SECTION_SPACING * 8;
  const galleryOffset = SECTION_SPACING * 9;
  const contactOffset = SECTION_SPACING * 10;

  const extraCircles = [
    { position: [competenciesOffset + 4.0, 2.2, 0], radius: 2.0, color: "#9bb8c9" },
    { position: [akeliusOffset + 4.5, 2.2, 0], radius: 2.1, color: "#111" },
    { position: [amadeusOffset + 6.8, -2.4, 0], radius: 1.8, color: "#ff3c16" },
    { position: [amadeusOffset + 4.2, 2.6, 0], radius: 2.2, color: "#ffa726" },
    { position: [inriaOffset + 8.8, 2.4, 0], radius: 2.6, color: "#9bb8c9" },
    { position: [contactOffset + 3.2, 2.2, 0], radius: 2.4, color: "#111" },
    { position: [contactOffset + 7.8, -2.6, 0], radius: 1.6, color: "#ff3c16" },
    { position: [creativeOffset + 7.2, 2.8, 0], radius: 2.8, color: "#ff3c16" },
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
        />
      ))}

      {devopsCircles.map((circle, idx) => (
        <ElasticCircle
          key={`devops-${idx}`}
          position={circle.position}
          radius={circle.radius}
          color={circle.color}
        />
      ))}

      {extraCircles.map((circle, idx) => (
        <ElasticCircle
          key={`extra-${idx}`}
          position={circle.position}
          radius={circle.radius}
          color={circle.color}
        />
      ))}

      <WobbleShape position={[amadeusOffset + 2.6, 2.2, 0]}>
        <mesh rotation={[0, 0, 0.5]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial color="#e9a7c8" />
        </mesh>
      </WobbleShape>

      <WobbleShape position={[amadeusOffset + 7.2, -0.6, 0]}>
        <mesh rotation={[0, 0, -0.2]}>
          <planeGeometry args={[1.2, 1.2]} />
          <meshBasicMaterial color="#9bb8c9" />
        </mesh>
      </WobbleShape>

      <WobbleShape position={[amadeusOffset + 9.6, 2.6, 0]}>
        <mesh rotation={[0, 0, 0.8]}>
          <coneGeometry args={[1.6, 1.8, 3]} />
          <meshBasicMaterial color="#ff3c16" />
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
      />
      <ThickLine
        start={linePositions.line2.start}
        end={linePositions.line2.end}
        color="white"
        thickness={0.07}
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

function KeepScroll() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const particlesRef = useRef([]);
  const bounceRef = useRef(0);
  const letterBounceRef = useRef([]);
  const spawnTimer = useRef(0);
  const frameRef = useRef(0);
  const rafRef = useRef(null);
  

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
      ctx.font = "62px Neue Machina, Space Grotesk, sans-serif";
      const textMetrics = ctx.measureText(text);
      const textW = textMetrics.width;
      const textH = 52;
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

        ctx.font = "28px serif";
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
      {previewSrc && (
        <video ref={videoRef} src={previewSrc} muted loop playsInline preload="metadata" poster={poster} />
      )}
    </button>
  );
}

export default function App() {
  const [progress, setProgress] = useState(0);
  const targetRef = useRef(0);
  const progressRef = useRef(0);
  const [showReelOpen, setShowReelOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState({ type: "youtube", url: "https://youtu.be/jFGiBOBfENY" });
  const [showMobileNotice, setShowMobileNotice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setShowMobileNotice(window.innerWidth <= 900);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.0025;
      targetRef.current = clamp(targetRef.current + delta, 0, MAX_SECTIONS);
    };

    window.addEventListener("wheel", onWheel, { passive: false });

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
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="world">
      <div
        className="world-track background-track"
        style={{
          transform: `translateX(${-progress * 100}vw)`,
          width: `${SECTIONS.length * 100}vw`,
        }}
      >
        <section className="screen hero-screen" />
        <section className="screen devops-screen" />
        <section className="screen competencies-screen" />
        <section className="screen simple-screen" />
        <section className="screen simple-screen" />
        <section className="screen simple-screen" />
        <section className="screen keep-screen" />
        <section className="screen creative-screen" />
        <section className="screen simple-screen" />
        <section className="screen gallery-screen" />
        <section className="screen contact-screen" />
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ antialias: true }}>
        <Scene progressRef={progressRef} />
      </Canvas>

      <div
        className="world-track foreground-track"
        style={{
          transform: `translateX(${-progress * 100}vw)`,
          width: `${SECTIONS.length * 100}vw`,
        }}
      >
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
            <span>Work , About</span>
          </div>

          <div className="hero-next">→</div>
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
            <WiggleTitle textLines={["Senior DevOps"]} emphasis />
            <WiggleTitle textLines={[ "Engineer"]} emphasis />
            <div className="devops-tagline">
              8+ years architecting cloud platforms, infrastructure strategy, and reliability.
              Expert in Kubernetes at scale, GitOps automation, and security-first architecture.
            </div>
          </div>
          <div className="devops-next">→</div>
        </section>

        <section className="screen competencies-screen">
          <div className="screen-card elastic-ui competencies-card">
            <h2>Core Competencies</h2>
            <div className="competency-grid">
              <div>
                <h3>Cloud & Infrastructure</h3>
                <p>AWS, Azure, Terraform (IaC), VPC/vWAN design, DNS, Secret Management, RBAC</p>
              </div>
              <div>
                <h3>Containers & Platform</h3>
                <p>Kubernetes (AKS, EKS), GitOps (FluxCD), Helm, GPU nodes, Karpenter, KEDA, AWS ParallelCluster, SLURM, HPC</p>
              </div>
              <div>
                <h3>CI/CD & Automation</h3>
                <p>Jenkins, GitLab CI, Azure DevOps, Self-Hosted Runners, Python, Go</p>
              </div>
              <div>
                <h3>Observability & SRE</h3>
                <p>Prometheus, Grafana, Datadog, ELK/EFK, Thanos, Loki</p>
              </div>
              <div>
                <h3>Security & Identity</h3>
                <p>Auth0, Microsoft Entra, Azure PIM, OAuth2/OIDC, Kyverno, IAM/RBAC, Vault, Snyk, SonarQube, PCI-DSS</p>
              </div>
            </div>
          </div>
        </section>

        <section className="screen simple-screen">
          <div className="screen-card elastic-ui dense-card">
            <h2>Akelius</h2>
            <p>Senior DevOps Engineer</p>
            <p className="date-line">October 2021 - Present · Berlin, Germany</p>
            <div className="dense-block">
              <h3>Strategic Platform & Infrastructure Leadership</h3>
              <ul>
                <li>Led Kubernetes platform strategy across 22 production clusters (AKS/EKS), supporting 40+ engineers and 5 product teams; reduced onboarding from 2 weeks to 2 days while sustaining 99.9% uptime for 100K+ users across 4 countries.</li>
                <li>Drove cloud consolidation strategy (AWS vs Azure), presenting executive business case and leading migration that cut annual infrastructure costs by 39% with zero business disruption.</li>
                <li>Architected multi-cloud infrastructure with Terraform, defining VPCs/VPNs/routing, IAM governance, and security posture standardized across AWS and Azure.</li>
                <li>Owned AI/HPC infra roadmap with GPU-backed Kubernetes and SLURM (AWS ParallelCluster), enabling analytics for 20K+ units and new AI-driven capabilities.</li>
              </ul>
            </div>
            <div className="dense-block">
              <h3>Observability & Platform Engineering Excellence</h3>
              <ul>
                <li>Established observability model with Prometheus, Grafana, Datadog, and ELK; defined SLIs/SLOs/SLAs and reduced MTTR by 45% via standardized incident response.</li>
                <li>Led GitOps adoption (FluxCD vs ArgoCD) across 22 clusters, delivering 60% faster releases and self-service deployments for 60+ engineers.</li>
                <li>Standardized CI/CD into a centralized Jenkins platform with self-hosted runners and Mac nodes; integrated Snyk and SonarQube for safer deployments across 8+ teams.</li>
              </ul>
            </div>
            <div className="dense-block">
              <h3>Security Governance, Innovation & Leadership</h3>
              <ul>
                <li>Implemented Kyverno policy-as-code guardrails, reducing security incidents by 60% while speeding compliant delivery.</li>
                <li>Led identity platform evaluation (Auth0, Microsoft Entra, Keycloak), shaping company-wide identity architecture and zero-trust adoption.</li>
                <li>Built a FinOps operating model with multi-cloud cost attribution (AWS, Azure, MongoDB Cloud) enabling chargeback for 8+ teams and sustained cost-aware decisions.</li>
                <li>Owned on-call and incident response strategy; mentored engineers on Kubernetes ops, reliability, and cloud cost awareness to raise platform maturity.</li>
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
                <li>Supported migration of large-scale Java systems to cloud-native platforms (OpenShift), improving scalability and operational resilience.</li>
                <li>Designed and operated a managed Apache platform using the Kubernetes Operator pattern (Golang), reducing manual operational effort.</li>
                <li>Participated in on-call rotations for high-traffic production systems.</li>
              </ul>
            </div>
            <div className="screen-card elastic-ui stacked-overlap">
              <h2>Amadeus Software Labs</h2>
              <p>Software Engineer</p>
              <p className="date-line">January 2018 – March 2020 · Bangalore, India</p>
              <ul>
                <li>Developed backend services and automation frameworks in Python and Java for distributed systems.</li>
                <li>Upgraded Apache and JBOSS servers to meet PCI-DSS compliance standards.</li>
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

        <section className="screen keep-screen">
          <KeepScroll />
        </section>

        <section className="screen creative-screen">
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
              { poster: "/images/11.png", span: 30, url: "https://youtube.com/shorts/pC4bX057qBo?feature=share" },
              { poster: "/images/2.png", span: 22, url: "https://youtube.com/shorts/uMB6769jVc4?feature=share" },
              { poster: "/images/2.jpg", span: 26, url: "https://youtu.be/ajGh1sRdnwo" },
              { poster: "/images/4.jpg", span: 34, url: "https://youtu.be/PfGdJA2TgmQ" },
              { poster: "/images/6.png", span: 20, url: "https://youtube.com/shorts/wxts8nWmAV4?feature=share" },
              { poster: "/images/7.png", span: 28, url: "https://youtube.com/shorts/AWq4gxgzEvY?feature=share" },
              { poster: "/images/8.png", span: 18, url: "https://youtube.com/shorts/R87ebYV8F5M?feature=share" },
              { poster: "/images/9.png", span: 24, url: "https://youtube.com/shorts/2ku-kRGBMMQ?feature=share" },
              { poster: "/images/10.png", span: 32, url: "https://youtube.com/shorts/RM1ItFUzC_A?feature=share" },
              { poster: "/images/3.jpg", span: 20, url: "https://youtube.com/shorts/WCqVEbqxoqw?feature=share" },
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

        <section className="screen contact-screen">
          <div className="screen-card elastic-ui clickable">
            <h2>Contact</h2>
            <p>
              <a href="mailto:ajrot.kartik@gmail.com">ajrot.kartik@gmail.com</a>
            </p>
            <span className="clickable">
              <a href="https://www.linkedin.com/in/kartikajrot/" target="_blank" rel="noreferrer">LinkedIn</a>
              {" · "}
              <a href="https://www.instagram.com/kartikajrot/" target="_blank" rel="noreferrer">Instagram</a>
              {" · "}
              <a href="https://medium.com/@kartikajrot" target="_blank" rel="noreferrer">Medium</a>
            </span>
          </div>
        </section>
      </div>

      {showReelOpen && (
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
                src={`https://www.youtube.com/embed/${activeVideo.url.split("v=")[1] ?? activeVideo.url.split("/").pop()?.split("?")[0]}?autoplay=1&playsinline=1`}
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
      )}
    </div>
  );
}
