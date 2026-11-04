import type { CSSProperties } from "react";

// « Cérémonie d'ouverture » de la page d'accueil : un baobab se dessine depuis les données du terrain,
// puis ses branches s'illuminent une à une (stratégie → … → indicateurs) jusqu'à l'impact.
// SVG + CSS uniquement (aucun script) ; les mouvements continus sont masqués si l'utilisateur réduit les animations.

const draw = (delay: number, duration = 1.4): CSSProperties =>
  ({ strokeDasharray: 1, ["--dash" as string]: 1, ["--dash-to" as string]: 0, animationDelay: `${delay}s`, animationDuration: `${duration}s` }) as CSSProperties;
const at = (delay: number): CSSProperties => ({ animationDelay: `${delay}s` });

const TRUNK = "M224 432 C 206 404, 198 370, 204 336 C 210 300, 238 276, 252 252 C 260 238, 262 226, 264 214 L 336 214 C 338 226, 340 238, 348 252 C 362 276, 390 300, 396 336 C 402 370, 394 404, 376 432 Z";

// Grandes branches (du tronc vers chaque nœud), dans l'ordre d'allumage : la couronne large et plate du baobab.
const BRANCHES = [
  { d: "M268 224 C 230 200, 180 168, 150 152 C 128 140, 110 132, 92 128", node: [92, 128], label: [92, 100], anchor: "middle" },
  { d: "M282 218 C 266 184, 240 140, 205 104", node: [205, 104], label: [190, 78], anchor: "middle" },
  { d: "M300 216 C 300 170, 300 120, 300 70", node: [300, 70], label: [300, 40], anchor: "middle" },
  { d: "M318 218 C 334 184, 360 140, 395 104", node: [395, 104], label: [410, 78], anchor: "middle" },
  { d: "M332 224 C 370 200, 420 168, 450 152 C 472 140, 490 132, 508 128", node: [508, 128], label: [508, 100], anchor: "middle" },
] as const;
const LEFT_TWIGS = [
  "M150 152 C 146 136, 142 124, 134 110", "M122 138 C 110 146, 96 154, 78 158", "M236 152 C 222 142, 206 138, 186 138",
  "M226 130 C 226 114, 230 102, 238 90", "M92 128 C 80 118, 70 110, 58 102", "M92 128 C 80 134, 68 140, 54 142",
  "M205 104 C 196 94, 190 84, 186 70", "M176 160 C 168 172, 156 180, 140 184", "M300 132 C 288 118, 276 110, 258 106", "M300 70 C 292 60, 288 52, 286 40",
];
const TWIGS = [...LEFT_TWIGS, ...LEFT_TWIGS.map((d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${600 - Number(x)} ${y}`))];
const ROOTS = ["M250 430 C 230 446, 200 456, 160 462", "M300 432 C 300 452, 300 470, 300 488", "M350 430 C 370 446, 400 456, 440 462", "M232 432 C 214 440, 192 444, 170 444", "M368 432 C 386 440, 408 444, 430 444"];

/** Trajet d'une impulsion : racine → tronc → départ de la branche → nœud. */
const motionPath = (d: string) => {
  const [, x, y, rest] = d.match(/^M([\d.]+) ([\d.]+) (.*)$/)!;
  return `M300 488 L300 224 L${x} ${y} ${rest}`;
};

const NODE_START = 3.1;
const NODE_STEP = 0.38;
const IMPACT_AT = NODE_START + NODE_STEP * BRANCHES.length + 0.25;

export function CeremonyTree({ nodes, roots, impact, aria }: { nodes: readonly string[]; roots: string; impact: string; aria: string }) {
  return (
    <svg viewBox="0 -56 600 576" className="h-auto w-full" role="img" aria-label={aria}>
      <defs>
        <radialGradient id="cer-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F6C66B" stopOpacity=".95" />
          <stop offset="35%" stopColor="#E3A13B" stopOpacity=".55" />
          <stop offset="100%" stopColor="#E3A13B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cer-trunk" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#0A3D3A" />
          <stop offset="45%" stopColor="#0F6B5B" />
          <stop offset="100%" stopColor="#08403B" />
        </linearGradient>
        <linearGradient id="cer-branch" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0%" stopColor="#2BA587" />
          <stop offset="100%" stopColor="#8FE0C6" />
        </linearGradient>
        <radialGradient id="cer-node" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF4D6" />
          <stop offset="55%" stopColor="#F2B84B" />
          <stop offset="100%" stopColor="#E3A13B" stopOpacity="0" />
        </radialGradient>
        <filter id="cer-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>

      {/* soleil levant derrière l'arbre */}
      <g className="fb animate-sun-rise">
        <circle cx="300" cy="200" r="250" fill="url(#cer-sun)" opacity=".55" />
        <circle cx="300" cy="200" r="130" fill="url(#cer-sun)" className="fb animate-glow motion-only" />
      </g>

      {/* horizon et racines « données terrain » */}
      <path d="M30 432 Q 300 414 570 432" fill="none" stroke="#5FC4A8" strokeOpacity=".5" strokeWidth="1.5" pathLength={1} className="animate-draw" style={draw(0.2, 1.6)} />
      {ROOTS.map((d, i) => (
        <path key={d} d={d} fill="none" stroke="#5FC4A8" strokeOpacity=".75" strokeWidth={i < 3 ? 3 : 2} strokeLinecap="round" pathLength={1} className="animate-draw" style={draw(0.4 + i * 0.08, 1)} />
      ))}
      <text x="300" y="512" textAnchor="middle" fontSize="13" fontWeight="600" letterSpacing="2" fill="#8FE0C6" className="animate-fade-in" style={at(1)}>{roots.toUpperCase()}</text>

      {/* tronc : contour dessiné puis rempli */}
      <path d={TRUNK} fill="url(#cer-trunk)" className="animate-fade-in" style={{ ...at(1.9), animationDuration: "1.2s" }} />
      <path d={TRUNK} fill="none" stroke="#5FC4A8" strokeWidth="2" strokeLinejoin="round" pathLength={1} className="animate-draw" style={draw(0.9, 1.6)} />
      <path d="M262 424 C 240 370, 236 300, 280 230" fill="none" stroke="#5FC4A8" strokeOpacity=".25" strokeWidth="1.5" pathLength={1} className="animate-draw" style={draw(1.6, 1.2)} />
      <path d="M338 424 C 360 370, 364 300, 320 230" fill="none" stroke="#5FC4A8" strokeOpacity=".25" strokeWidth="1.5" pathLength={1} className="animate-draw" style={draw(1.7, 1.2)} />

      {/* branches */}
      {BRANCHES.map((b, i) => (
        <path key={b.d} d={b.d} fill="none" stroke="url(#cer-branch)" strokeWidth="9" strokeLinecap="round" pathLength={1} className="animate-draw" style={draw(2.0 + i * 0.1, 1.2)} />
      ))}
      {TWIGS.map((d, i) => (
        <path key={d} d={d} fill="none" stroke="#5FC4A8" strokeWidth={i % LEFT_TWIGS.length < 4 ? 4 : 2.5} strokeLinecap="round" pathLength={1} className="animate-draw" style={draw(2.5 + (i % LEFT_TWIGS.length) * 0.06, 0.9)} />
      ))}

      {/* impulsions de données remontant des racines vers chaque nœud */}
      <g className="motion-only">
        {BRANCHES.map((b, i) => (
          <circle key={i} r="3.5" fill="#FFE7A8" opacity="0" filter="url(#cer-glow)">
            <animateMotion dur="2.6s" begin={`${IMPACT_AT + 0.6 + i * 0.5}s`} repeatCount="indefinite" path={motionPath(b.d)} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="2.6s" begin={`${IMPACT_AT + 0.6 + i * 0.5}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>

      {/* nœuds qui s'allument un à un */}
      {BRANCHES.map((b, i) => {
        const t = NODE_START + i * NODE_STEP;
        const [x, y] = b.node;
        return (
          <g key={`n${i}`}>
            <circle cx={x} cy={y} r="10" fill="none" stroke="#F2B84B" strokeWidth="2" className="fb animate-burst" style={at(t)} />
            <circle cx={x} cy={y} r="18" fill="url(#cer-node)" className="fb animate-node" style={at(t)} />
            <circle cx={x} cy={y} r="6" fill="#FFF7E3" className="fb animate-node" style={at(t)} />
            <text x={b.label[0]} y={b.label[1]} textAnchor={b.anchor} fontSize="15" fontWeight="700" fill="#fff" className="svg-label animate-fade-in" style={at(t + 0.15)}>{nodes[i]}</text>
          </g>
        );
      })}

      {/* apothéose : l'impact */}
      <g>
        <circle cx="300" cy="70" r="26" fill="none" stroke="#F6C66B" strokeWidth="2" className="fb animate-burst" style={{ ...at(IMPACT_AT), animationDuration: "1.8s" }} />
        <circle cx="300" cy="70" r="40" fill="none" stroke="#F6C66B" strokeWidth="1.5" className="fb animate-burst" style={{ ...at(IMPACT_AT + 0.25), animationDuration: "2s" }} />
        <text x="300" y="-14" textAnchor="middle" fontSize="30" fontWeight="800" letterSpacing="4" fill="#F6C66B" className="svg-label fb animate-word-in" style={at(IMPACT_AT)}>{impact.toUpperCase()}</text>
      </g>
    </svg>
  );
}

/** Lucioles qui montent doucement dans la scène (positions fixes : rendu identique serveur / client). */
export function Fireflies({ count = 22 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden motion-only" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 37 + 11) % 100;
        const size = 2 + (i % 3);
        return (
          <span
            key={i}
            className="absolute bottom-0 animate-rise rounded-full bg-[#FFE7A8] shadow-[0_0_8px_2px_rgba(246,198,107,.6)]"
            style={{ left: `${left}%`, width: size, height: size, animationDelay: `${-((i * 1.7) % 9)}s`, animationDuration: `${8 + (i % 5) * 1.6}s`, ["--sway" as string]: `${((i % 7) - 3) * 14}px` } as CSSProperties}
          />
        );
      })}
    </div>
  );
}
