import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import "./App.css";

/* ===== 1. MASKED HOVER TEXT (Adidas/Active Theory Style) ===== */
function MaskedText({ topText, bottomText }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const colors = ["#ff5722", "#ffa726", "#9b59b6", "#ffb84d", "#00d4ff"];

  const renderLetters = (text, rowId) =>
      text.split("").map((char, i) => {
        const id = `${rowId}-${i}`;
        return (
            <span
                key={id}
                className="letter"
                style={{
                  color: hoverIdx === id ? colors[Math.floor(Math.random() * colors.length)] : "white",
                  transform: hoverIdx === id ? "scale(1.2) translateY(-10px)" : "scale(1)",
                }}
                onMouseEnter={() => setHoverIdx(id)}
                onMouseLeave={() => setHoverIdx(null)}
            >
          {char === " " ? "\u00A0" : char}
        </span>
        );
      });

  return (
      <div className="masked-container">
        <div className="black-box-row">{renderLetters(topText, "top")}</div>
        <div className="black-box-row">{renderLetters(bottomText, "bottom")}</div>
      </div>
  );
}

/* ===== ELASTIC CIRCLE (Mouse Reactive) ===== */
function ElasticCircle({ position, radius, segments = 64 }) {
  const meshRef = useRef();
  const originalPositions = useRef([]);
  const mouse = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const geom = new THREE.CircleGeometry(radius, segments);
    originalPositions.current = geom.attributes.position.array.slice();
    return geom;
  }, [radius, segments]);

  useFrame(({ mouse: m, viewport }) => {
    if (!meshRef.current) return;

    mouse.current.x = (m.x * viewport.width) / 2;
    mouse.current.y = (m.y * viewport.height) / 2;

    const positions = meshRef.current.geometry.attributes.position.array;
    const origPos = originalPositions.current;

    for (let i = 0; i < positions.length; i += 3) {
      const x = origPos[i] + position[0];
      const y = origPos[i + 1] + position[1];

      const dx = mouse.current.x - x;
      const dy = mouse.current.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxDist = radius * 1;
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
    <mesh ref={meshRef} position={[position[0], position[1], position[2]]} geometry={geometry}>
      <meshBasicMaterial color="#1a1a1a" side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ===== THICK LINE (Dynamic Underlines) ===== */
function ThickLine({ start, end, segments = 32, color = "white", thickness = 0.07 }) {
  const meshRef = useRef();
  const originalPositions = useRef([]);
  const mouse = useRef({ x: 0, y: 0 });

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

    const positions = meshRef.current.geometry.attributes.position.array;
    const origPos = originalPositions.current;

    for (let i = 0; i < positions.length; i += 3) {
      const x = origPos[i];
      const y = origPos[i + 1];

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

/* ===== BOUNCING BALL ===== */
function BouncingBall({ initialPosition, onDisappear, circles, radius = 0.1 }) {
  const meshRef = useRef();
  const velocity = useRef({ x: (Math.random() - 0.5) * 0.03, y: 0, z: 0 });
  const lifetime = useRef(0);
  const maxLifetime = 300;

  useFrame(({ viewport }) => {
    if (!meshRef.current) return;

    lifetime.current++;

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

    if (meshRef.current.position.x + 0.1 > viewport.width * 4) {
      onDisappear();
      return;
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
      <meshBasicMaterial color="#1a1a1a" transparent />
    </mesh>
  );
}

/* ===== PARTICLE SYSTEM ===== */
function ParticleSystem() {
  const [particles, setParticles] = useState([]);
  const { viewport } = useThree();
  const nextId = useRef(0);

  const circles = [
    { position: [1.9, 1.4, 0], radius: 3.6 },
    { position: [8, -3, 0], radius: 2 },
    { position: [8.5, 3, 0], radius: 0.6 },
    { position: [-6, -4, 0], radius: 0.35 },
    { position: [-4, -2, 0], radius: 0.5 },
    { position: [6.8, 0, 0], radius: 0.65 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const x = (Math.random() - 0.5) * viewport.width;
      const y = viewport.height / 2 + 1;
      const radius = 0.05 + Math.random() * 0.15;

      setParticles((prev) => [
        ...prev,
        { id: nextId.current++, position: [x, y, 0], radius },
      ]);
    }, 700);

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

/* ===== HERO SCENE ===== */
function HeroScene() {
  const { viewport, size } = useThree();
  const [linePositions, setLinePositions] = useState({
    line1: { start: [-7, 0.5, 0], end: [-4.2, 0.5, 0] },
    line2: { start: [-8, -1.5, 0], end: [-4.2, -1.5, 0] },
  });

  useEffect(() => {
    const updateLinePositions = () => {
      const kartikEl = document.getElementById("kartik-text");
      const ajrotEl = document.getElementById("ajrot-text");

      if (kartikEl && ajrotEl) {
        const kartikRect = kartikEl.getBoundingClientRect();
        const ajrotRect = ajrotEl.getBoundingClientRect();

        const kartikY = -(kartikRect.bottom / size.height) * viewport.height + viewport.height / 2 + 0.3;
        const ajrotY = -(ajrotRect.bottom / size.height) * viewport.height + viewport.height / 2 + 0.3;

        const kartikStartX = (kartikRect.left / size.width) * viewport.width - viewport.width / 2;
        const kartikEndX = (kartikRect.right / size.width) * viewport.width - viewport.width / 2;

        const ajrotStartX = (ajrotRect.left / size.width) * viewport.width - viewport.width / 2;
        const ajrotEndX = (ajrotRect.right / size.width) * viewport.width - viewport.width / 2;

        setLinePositions({
          line1: {
            start: [kartikStartX + 1.15, kartikY - 0.1, 0],
            end: [kartikEndX, kartikY - 0.1, 0],
          },
          line2: {
            start: [ajrotStartX, ajrotY - 0.1, 0],
            end: [ajrotEndX - 0.5, ajrotY - 0.1, 0],
          },
        });
      }
    };

    updateLinePositions();
    window.addEventListener("resize", updateLinePositions);
    setTimeout(updateLinePositions, 100);

    return () => window.removeEventListener("resize", updateLinePositions);
  }, [viewport, size]);

  return (
    <>
      <ElasticCircle position={[1.9, 1.4, 0]} radius={3.6} />
      <ElasticCircle position={[8, -3, 0]} radius={2} />
      <ElasticCircle position={[8.5, 3, 0]} radius={0.6} />
      <ElasticCircle position={[-6, -4, 0]} radius={0.35} />
      <ElasticCircle position={[-4, -2, 0]} radius={0.5} />
      <ElasticCircle position={[6.8, 0, 0]} radius={0.65} />

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

      <ParticleSystem />
    </>
  );
}

/* ===== COLOR-CHANGING TEXT COMPONENT ===== */
function ColorChangingText({ children, className = "" }) {
  const [colorMap, setColorMap] = useState({});
  const colors = ['#ff5722', '#ffa726', '#9b59b6', '#ffb84d', '#00d4ff'];

  const handleMouseMove = (e) => {
    const letters = e.currentTarget.querySelectorAll('span');
    letters.forEach((letter, index) => {
      const rect = letter.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );

      if (distance < 100) {
        setColorMap(prev => ({
          ...prev,
          [index]: colors[Math.floor(Math.random() * colors.length)]
        }));
      }
    });
  };

  return (
    <h1 className={className} onMouseMove={handleMouseMove}>
      {children.split('').map((char, i) => (
        <span key={i} style={{
          color: colorMap[i] || 'white',
          transition: 'color 0.3s'
        }}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </h1>
  );
}

/* ===== MAIN APP ===== */
export default function App() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const maxScroll = window.innerHeight * 7; // 8 screens
      const progress = Math.min(scrollPosition / maxScroll, 1);
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    document.body.style.height = "800vh";
    document.body.style.overflow = "auto";

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.style.height = "";
      document.body.style.overflow = "";
    };
  }, []);

  const translateX = -scrollProgress * 100 * 8;

  return (
    <div className="app-container" style={{ transform: `translateX(${translateX}vw)` }}>

      {/* SCREEN 1: HERO */}
      <div className="screen hero-screen">
        <div className="hero-text-container">
          <h1 id="kartik-text" className="hero-name">Kartik</h1>
          <h1 id="ajrot-text" className="hero-name">Ajrot</h1>
          <p className="hero-description">
            DEVOPS SPECIALIST<br />
            PLATFORM ENGINEER<br />
            BASED IN BERLIN, GERMANY
          </p>
        </div>
        <div className="bottom-left"><p className="italic-links">Work , About</p></div>
        <div className="bottom-right-arrow"><span>→</span></div>
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ antialias: true }}>
          <HeroScene />
        </Canvas>
      </div>

      {/* SCREEN 2: DEVOPS ENGINEER */}
      <section className="screen center">
        <MaskedText topText="DevOps" bottomText="ENGINEER" />
      </section>

      {/* SCREEN 3: AKELIUS + TECH STACK */}
      <div className="screen akelius-screen">
        <div className="exp-half">
          <div className="company-badge">AKELIUS TECHNOLOGY</div>
          <h2>DevOps Specialist & Product Manager</h2>
          <p className="period">May 2024 - Present · Berlin</p>
          <ul>
            <li>Multi-cloud infrastructure (Azure/AWS) serving 100K+ users</li>
            <li>28% cost savings through consolidation</li>
            <li>Policy-as-code security with Kyverno</li>
          </ul>
        </div>
        <div className="tech-half">
          <h3>Tech Stack</h3>
          <div className="tech-tags">
            {['Azure', 'AWS', 'Kubernetes', 'Docker', 'Terraform', 'Ansible', 'FluxCD',
              'Prometheus', 'Grafana', 'GitLab CI', 'Kyverno', 'Vault', 'Go', 'Python'].map((tech, i) => (
              <span key={i}>{tech}</span>
            ))}
          </div>
        </div>
      </div>

      {/* SCREEN 4: AMADEUS */}
      <div className="screen amadeus-screen">
        <div className="company-badge">AMADEUS SOFTWARE LABS</div>
        <div className="role-block">
          <h2>Senior DevOps Engineer</h2>
          <p className="period">Jan 2021 - Apr 2024 · Bangalore</p>
          <ul>
            <li>Led 7+ K8s clusters in production</li>
            <li>60% faster deployments via CI/CD automation</li>
            <li>Established observability with Prometheus & Grafana</li>
          </ul>
        </div>
        <div className="role-block">
          <h2>Software Engineer - DevOps</h2>
          <p className="period">Jul 2018 - Dec 2020 · Bangalore</p>
          <ul>
            <li>Travel platform migrations to cloud-native</li>
            <li>Built monitoring and alerting systems</li>
            <li>Infrastructure automation with Ansible</li>
          </ul>
        </div>
      </div>

      {/* SCREEN 5: CREATIVE HUMAN */}
      <div className="screen title-screen">
        <ColorChangingText className="big-title">Creative Human</ColorChangingText>
      </div>

      {/* SCREEN 6: TRAVEL & VIDEOS */}
      <div className="screen travel-screen">
        <h2>Travel & Aviation</h2>
        <div className="video-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="video-card">
              <div className="video-thumbnail">
                <div className="play-button">▶</div>
                <span className="video-title">Travel Video {i}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SCREEN 7: CONTACT */}
      <div className="screen contact-screen">
        <h1>Let's Connect</h1>
        <p>Open to exciting opportunities in Cloud & DevOps</p>
        <div className="social-links">
          <a href="https://linkedin.com/in/kartik">LinkedIn</a>
          <a href="https://github.com/kartik">GitHub</a>
          <a href="https://medium.com/@kartik">Medium</a>
          <a href="mailto:kartik@example.com">Email</a>
        </div>
        <p className="location">📍 Berlin, Germany</p>
      </div>

      {/* SCREEN 8: KEEP SCROLLING */}
      <div className="screen keep-scrolling-screen">
        <div className="keep-scrolling-circle">
          <h1 className="keep-scrolling-text">
            Keep scro<span className="bouncy-o">o</span>
            <span className="bouncy-o">o</span>
            <span className="bouncy-o">o</span>
            <span className="bouncy-o">o</span>lling
          </h1>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className={`pac-blob pac-blob-${i}`}>👀</div>
          ))}
        </div>
      </div>

    </div>
  );
}
