import { useState, useEffect, useRef, useCallback } from "react";

// ─── MATH ENGINE ────────────────────────────────────────────────────────────

function complexMul([ar, ai], [br, bi]) {
  return [ar * br - ai * bi, ar * bi + ai * br];
}
function complexAdd([ar, ai], [br, bi]) {
  return [ar + br, ai + bi];
}

function applyGate(state, gate, target, n) {
  const next = state.map(() => [0, 0]);
  const size = 1 << n;
  for (let i = 0; i < size; i++) {
    const bit = (i >> (n - 1 - target)) & 1;
    if (bit === 0) {
      const j = i | (1 << (n - 1 - target));
      next[i] = complexAdd(next[i], complexMul(gate[0][0], state[i]));
      next[i] = complexAdd(next[i], complexMul(gate[0][1], state[j]));
      next[j] = complexAdd(next[j], complexMul(gate[1][0], state[i]));
      next[j] = complexAdd(next[j], complexMul(gate[1][1], state[j]));
    }
  }
  return next;
}

function applyCNOT(state, control, target, n) {
  const next = state.map((v) => [...v]);
  const size = 1 << n;
  for (let i = 0; i < size; i++) {
    const cBit = (i >> (n - 1 - control)) & 1;
    const tBit = (i >> (n - 1 - target)) & 1;
    if (cBit === 1 && tBit === 0) {
      const j = i | (1 << (n - 1 - target));
      const tmp = [...next[i]];
      next[i] = [...next[j]];
      next[j] = tmp;
    }
  }
  return next;
}

// Grover oracle: marks state `target` by flipping its sign
function applyOracle(state, markedIndex) {
  const next = state.map((v) => [...v]);
  next[markedIndex] = [-next[markedIndex][0], -next[markedIndex][1]];
  return next;
}

// Grover diffuser: inversion about average
function applyDiffuser(state, n) {
  const size = 1 << n;
  const avgR = state.reduce((s, v) => s + v[0], 0) / size;
  const avgI = state.reduce((s, v) => s + v[1], 0) / size;
  return state.map(([r, i]) => [2 * avgR - r, 2 * avgI - i]);
}

const S2 = 1 / Math.sqrt(2);
const GATE_DEFS = {
  H:    { matrix: [[[S2,0],[S2,0]], [[S2,0],[-S2,0]]], color: "#00f5d4" },
  X:    { matrix: [[[0,0],[1,0]], [[1,0],[0,0]]], color: "#f72585" },
  Y:    { matrix: [[[0,0],[0,-1]], [[0,1],[0,0]]], color: "#c77dff" },
  Z:    { matrix: [[[1,0],[0,0]], [[0,0],[-1,0]]], color: "#4361ee" },
  S:    { matrix: [[[1,0],[0,0]], [[0,0],[0,1]]], color: "#f8961e" },
  T:    { matrix: [[[1,0],[0,0]], [[0,0],[S2,S2]]], color: "#43aa8b" },
};

function initState(n) {
  const s = Array.from({ length: 1 << n }, () => [0, 0]);
  s[0] = [1, 0];
  return s;
}

function runCircuit(ops, n) {
  let state = initState(n);
  const snaps = [{ state: state.map(v => [...v]), label: "Initial state |000⟩" }];
  for (const op of ops) {
    if (op.type === "CNOT") {
      state = applyCNOT(state, op.control, op.target, n);
      snaps.push({ state: state.map(v => [...v]), label: `CNOT — control q${op.control}, target q${op.target}` });
    } else if (op.type === "ORACLE") {
      state = applyOracle(state, op.marked);
      snaps.push({ state: state.map(v => [...v]), label: `Oracle — marks |${op.marked.toString(2).padStart(n,"0")}⟩ with a phase flip` });
    } else if (op.type === "DIFFUSER") {
      state = applyDiffuser(state, n);
      snaps.push({ state: state.map(v => [...v]), label: "Diffuser — amplifies marked state via interference" });
    } else {
      state = applyGate(state, GATE_DEFS[op.type].matrix, op.qubit, n);
      snaps.push({ state: state.map(v => [...v]), label: `${op.type} gate on q${op.qubit}` });
    }
  }
  return snaps;
}

function getProbs(state, n) {
  return state.map((amp, i) => ({
    label: i.toString(2).padStart(n, "0"),
    prob: amp[0] ** 2 + amp[1] ** 2,
  }));
}

// ─── PRESETS ────────────────────────────────────────────────────────────────

const N = 3;

const PRESETS = {
  "Bell State": {
    ops: [
      { type: "H", qubit: 0, col: 0 },
      { type: "CNOT", control: 0, target: 1, col: 1 },
    ],
    explanation: {
      title: "Bell State — Quantum Entanglement",
      what: "Two qubits become entangled. Measuring always gives 00 or 11 — never 01 or 10.",
      steps: [
        "H on q0 creates superposition: q0 is now 50% |0⟩ and 50% |1⟩ simultaneously.",
        "CNOT links q0 and q1: if q0 is |1⟩, flip q1. Since q0 is in superposition, both outcomes happen together.",
        "Result: the qubits are entangled. They share a single quantum state.",
      ],
      insight: "Einstein called this 'spooky action at a distance.' It is real, verified, and the foundation of quantum cryptography.",
    }
  },
  "Superposition": {
    ops: [
      { type: "H", qubit: 0, col: 0 },
      { type: "H", qubit: 1, col: 0 },
      { type: "H", qubit: 2, col: 0 },
    ],
    explanation: {
      title: "Full Superposition",
      what: "All 3 qubits in superposition — all 8 outcomes equally likely.",
      steps: [
        "H on q0: splits into 50/50 superposition.",
        "H on q1: splits q1 independently — now 4 equally likely states.",
        "H on q2: splits q2 — now all 8 states equally likely at 12.5% each.",
      ],
      insight: "This is the starting point of most quantum algorithms — put everything in superposition so all answers can be considered simultaneously.",
    }
  },
  "Grover's Search": {
    ops: [
      { type: "H", qubit: 0, col: 0 },
      { type: "H", qubit: 1, col: 0 },
      { type: "H", qubit: 2, col: 0 },
      { type: "ORACLE", marked: 5, col: 1 },
      { type: "DIFFUSER", col: 2 },
      { type: "ORACLE", marked: 5, col: 3 },
      { type: "DIFFUSER", col: 4 },
    ],
    explanation: {
      title: "Grover's Search Algorithm",
      what: "Finds the marked item |101⟩ (index 5) in an unsorted list of 8. Classical: up to 8 checks. Grover's: ~3 steps.",
      steps: [
        "H on all qubits: all 8 states at equal 12.5% probability. Every answer considered at once.",
        "Oracle: flips the phase of the marked state |101⟩. Invisible at measurement but sets up interference.",
        "Diffuser: inverts all amplitudes about their average — wrong answers shrink, |101⟩ grows.",
        "Repeat oracle + diffuser: after 2 iterations, |101⟩ dominates near 100%.",
      ],
      insight: "Grover's provides a quadratic speedup. For 1 million items: classical needs ~500,000 checks, Grover's needs ~1,000. This is quantum advantage.",
    }
  },
  "GHZ State": {
    ops: [
      { type: "H", qubit: 0, col: 0 },
      { type: "CNOT", control: 0, target: 1, col: 1 },
      { type: "CNOT", control: 0, target: 2, col: 2 },
    ],
    explanation: {
      title: "GHZ State — 3-Qubit Entanglement",
      what: "All 3 qubits entangled together. Measuring gives 000 or 111 only.",
      steps: [
        "H on q0: creates superposition on the first qubit.",
        "CNOT q0→q1: entangles q1 with q0.",
        "CNOT q0→q2: entangles q2 with q0.",
        "All three share one quantum state. Measuring any one instantly determines the others.",
      ],
      insight: "Used in quantum error correction and multi-party quantum cryptography. Named after Greenberger, Horne, and Zeilinger.",
    }
  },
  "Pauli-X (NOT)": {
    ops: [
      { type: "X", qubit: 0, col: 0 },
    ],
    explanation: {
      title: "Pauli-X Gate — Quantum NOT",
      what: "Flips |0⟩ to |1⟩. Identical to a classical NOT gate.",
      steps: [
        "X on q0: flips from |0⟩ to |1⟩. q1 and q2 stay at |0⟩.",
        "Result: 100% probability of measuring |100⟩.",
      ],
      insight: "The simplest quantum gate. Identical in behaviour to a classical NOT. No superposition, no entanglement — just a flip.",
    }
  },
};

// ─── URL ENCODING ────────────────────────────────────────────────────────────

function encodeCircuit(ops) {
  return btoa(JSON.stringify(ops));
}
function decodeCircuit(str) {
  try { return JSON.parse(atob(str)); } catch { return null; }
}

// ─── BLOCH SPHERE ────────────────────────────────────────────────────────────

function BlochSphere({ state }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, r = W * 0.36;
    ctx.clearRect(0, 0, W, H);

    // sphere
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,245,212,0.15)";
    ctx.lineWidth = 1; ctx.stroke();

    // equator
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,245,212,0.1)"; ctx.stroke();

    // meridian
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.28, r, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,245,212,0.08)"; ctx.stroke();

    // poles
    ctx.font = "9px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("|0⟩", cx + 4, cy - r - 4);
    ctx.fillText("|1⟩", cx + 4, cy + r + 12);

    // Bloch vector
    const a = state[0], b = state[1];
    const norm = Math.sqrt(a[0]**2+a[1]**2+b[0]**2+b[1]**2) || 1;
    const theta = 2 * Math.acos(Math.min(1, Math.sqrt((a[0]**2+a[1]**2))/norm));
    const phi = Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0]);
    const bx = Math.sin(theta)*Math.cos(phi);
    const bz = Math.cos(theta);
    const by = Math.sin(theta)*Math.sin(phi);
    const px = cx + r*(bx*0.7 + by*0.2);
    const py = cy - r*bz + r*by*0.1;

    // glow
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 16);
    grad.addColorStop(0, "rgba(0,245,212,0.4)");
    grad.addColorStop(1, "rgba(0,245,212,0)");
    ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI*2);
    ctx.fillStyle = grad; ctx.fill();

    // vector line
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py);
    ctx.strokeStyle = "#00f5d4"; ctx.lineWidth = 2; ctx.stroke();

    // dot
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2);
    ctx.fillStyle = "#00f5d4";
    ctx.shadowColor = "#00f5d4"; ctx.shadowBlur = 10;
    ctx.fill(); ctx.shadowBlur = 0;
  }, [state]);
  return <canvas ref={ref} width={140} height={140} />;
}

// ─── PROBABILITY BARS ────────────────────────────────────────────────────────

function ProbBars({ probs, prevProbs }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {probs.map(({ label, prob }, i) => {
        const prev = prevProbs?.[i]?.prob ?? 0;
        const changed = Math.abs(prob - prev) > 0.001;
        return (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{
                fontFamily: "monospace", fontSize: 11,
                color: prob > 0.01 ? "#e0e0e0" : "#2a2a2a",
                transition: "color 0.3s"
              }}>|{label}⟩</span>
              <span style={{
                fontFamily: "monospace", fontSize: 11,
                color: prob > 0.5 ? "#00f5d4" : prob > 0.01 ? "#888" : "#222",
                fontWeight: prob > 0.5 ? 700 : 400,
                transition: "color 0.3s"
              }}>{(prob * 100).toFixed(1)}%</span>
            </div>
            <div style={{ height: 5, background: "#080f0f", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${Math.max(0, Math.min(100, prob * 100))}%`,
                background: prob > 0.7
                  ? "linear-gradient(90deg, #00f5d4, #00f5d4cc)"
                  : prob > 0.01 ? "#00f5d466" : "transparent",
                boxShadow: prob > 0.5 ? "0 0 8px #00f5d444" : "none",
                transition: "width 0.5s cubic-bezier(0.4,0,0.2,1), background 0.3s",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const [ops, setOps] = useState([]);
  const [selectedGate, setSelectedGate] = useState("H");
  const [cnotStep, setCnotStep] = useState(null); // {qubit, col}
  const [snaps, setSnaps] = useState(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef(null);
  const COLS = 7;

  // Load from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("c");
    if (encoded) {
      const decoded = decodeCircuit(encoded);
      if (decoded) { setOps(decoded); setActivePreset(null); }
    }
  }, []);

  const currentSnap = snaps?.[step];
  const prevSnap = snaps?.[Math.max(0, step - 1)];
  const currentProbs = currentSnap ? getProbs(currentSnap.state, N) : getProbs(initState(N), N);
  const prevProbs = prevSnap ? getProbs(prevSnap.state, N) : null;

  const loadPreset = (name) => {
    clearInterval(intervalRef.current);
    setPlaying(false);
    setSnaps(null);
    setStep(0);
    setCnotStep(null);
    setActivePreset(name);
    setOps(PRESETS[name].ops);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setPlaying(false);
    setSnaps(null);
    setStep(0);
    setOps([]);
    setActivePreset(null);
    setCnotStep(null);
  };

  const run = useCallback(() => {
    clearInterval(intervalRef.current);
    const sorted = [...ops].sort((a, b) => (a.col ?? 0) - (b.col ?? 0));
    const s = runCircuit(sorted, N);
    setSnaps(s);
    setStep(0);
    setPlaying(true);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setStep(i);
      if (i >= s.length - 1) {
        clearInterval(intervalRef.current);
        setPlaying(false);
      }
    }, 600);
  }, [ops]);

  const stepBack = () => { clearInterval(intervalRef.current); setPlaying(false); setStep(s => Math.max(0, s-1)); };
  const stepFwd  = () => { clearInterval(intervalRef.current); setPlaying(false); setStep(s => Math.min((snaps?.length??1)-1, s+1)); };

  const shareCircuit = () => {
    const encoded = encodeCircuit(ops);
    const url = `${window.location.origin}${window.location.pathname}?c=${encoded}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCellClick = (qubit, col) => {
    if (selectedGate === "CNOT") {
      if (!cnotStep) {
        setCnotStep({ qubit, col });
      } else {
        if (cnotStep.qubit !== qubit) {
          setOps(o => [...o, { type: "CNOT", control: cnotStep.qubit, target: qubit, col: cnotStep.col }]);
          setSnaps(null);
        }
        setCnotStep(null);
      }
      return;
    }
    const exists = ops.find(op => op.qubit === qubit && op.col === col && op.type !== "CNOT");
    if (!exists) {
      setOps(o => [...o, { type: selectedGate, qubit, col }]);
      setSnaps(null);
    }
  };

  const removeOp = (idx, e) => {
    e.stopPropagation();
    setOps(o => o.filter((_, i) => i !== idx));
    setSnaps(null);
  };

  const gateAt = (q, c) => ops.find(op => op.qubit === q && op.col === c && op.type !== "CNOT" && op.type !== "ORACLE" && op.type !== "DIFFUSER");
  const cnotAt = (q, c) => ops.filter(op => op.type === "CNOT" && (op.control === q || op.target === q) && op.col === c);

  const presetExplanation = activePreset ? PRESETS[activePreset].explanation : null;

  return (
    <div style={{
      minHeight: "100vh", background: "#020608",
      color: "#e0e0e0", fontFamily: "'IBM Plex Mono', monospace",
      padding: "20px clamp(16px, 4vw, 48px)",
      maxWidth: 1100, margin: "0 auto", width: "100%",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        button { font-family: 'IBM Plex Mono', monospace; cursor: pointer; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 4, color: "#00f5d4", marginBottom: 2 }}>QUANTUM CIRCUIT SIMULATOR</div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -1, lineHeight: 1 }}>
            QuantCalc<span style={{ color: "#00f5d4" }}>.</span>
          </div>
          <div style={{ fontSize: 9, color: "#333", marginTop: 2, letterSpacing: 1 }}>V1 — build in public</div>
        </div>
        <button onClick={shareCircuit} disabled={ops.length === 0} style={{
          background: copied ? "#00f5d422" : "transparent",
          border: `1px solid ${copied ? "#00f5d4" : "#1a2a2a"}`,
          color: copied ? "#00f5d4" : "#444",
          padding: "6px 14px", fontSize: 10, borderRadius: 2,
          letterSpacing: 1, transition: "all 0.2s",
        }}>
          {copied ? "✓ LINK COPIED" : "SHARE CIRCUIT"}
        </button>
      </div>

      {/* Presets */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 7 }}>PRESETS</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.keys(PRESETS).map(name => (
            <button key={name} onClick={() => loadPreset(name)} style={{
              background: activePreset === name ? "#00f5d411" : "transparent",
              border: `1px solid ${activePreset === name ? "#00f5d4" : "#1a2a2a"}`,
              color: activePreset === name ? "#00f5d4" : "#555",
              padding: "5px 11px", fontSize: 10, borderRadius: 2, letterSpacing: 0.5,
              transition: "all 0.15s",
            }}>{name}</button>
          ))}
        </div>
      </div>

      {/* Explanation panel */}
      {presetExplanation && snaps && (
        <div className="fade-in" style={{
          background: "#040e0e", border: "1px solid #0a2020",
          borderRadius: 4, padding: "14px 16px", marginBottom: 18,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#00f5d4", marginBottom: 6 }}>{presetExplanation.title}</div>
          <div style={{ fontSize: 10, color: "#888", marginBottom: 10, lineHeight: 1.6 }}>{presetExplanation.what}</div>
          {presetExplanation.steps.map((s, i) => (
            <div key={i} style={{
              display: "flex", gap: 8, marginBottom: 5,
              opacity: step >= i ? 1 : 0.25, transition: "opacity 0.4s",
            }}>
              <span style={{ color: "#00f5d4", fontSize: 9, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span style={{ fontSize: 10, color: "#aaa", lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #0a2020", fontSize: 10, color: "#f8961e", lineHeight: 1.5 }}>
            💡 {presetExplanation.insight}
          </div>
        </div>
      )}

      {/* Current step label */}
      {snaps && (
        <div style={{
          fontSize: 10, color: "#555", marginBottom: 10,
          minHeight: 16, letterSpacing: 0.5,
        }}>
          <span style={{ color: "#00f5d4" }}>step {step}/{snaps.length - 1}</span>
          {" — "}{snaps[step]?.label}
        </div>
      )}

      {/* Gate palette */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 7 }}>GATE</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[...Object.keys(GATE_DEFS), "CNOT"].map(g => {
            const color = g === "CNOT" ? "#ff6b6b" : GATE_DEFS[g].color;
            const active = selectedGate === g;
            return (
              <button key={g} onClick={() => { setSelectedGate(g); setCnotStep(null); }} style={{
                background: active ? `${color}18` : "transparent",
                border: `1px solid ${active ? color : "#1a2a2a"}`,
                color: active ? color : "#444",
                padding: "5px 13px", fontSize: 11, fontWeight: 600,
                borderRadius: 2, letterSpacing: 0.5, transition: "all 0.15s",
              }}>{g}</button>
            );
          })}
        </div>
        {selectedGate === "CNOT" && (
          <div style={{ fontSize: 9, color: cnotStep ? "#f8961e" : "#555", marginTop: 6, letterSpacing: 0.5 }}>
            {cnotStep ? `Control set at q${cnotStep.qubit} — now click the target qubit` : "Click control qubit first, then target qubit"}
          </div>
        )}
      </div>

      {/* Circuit grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 10 }}>CIRCUIT</div>
        <div style={{ overflowX: "auto" }}>
          {Array.from({ length: N }, (_, q) => (
            <div key={q} style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <div style={{ width: 26, fontSize: 10, color: "#00f5d4", flexShrink: 0, letterSpacing: 1 }}>q{q}</div>
              <div style={{ display: "flex", position: "relative", flex: 1, overflowX: "auto"}}>
                {/* wire */}
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#0d1f1f", zIndex: 0 }} />
                {Array.from({ length: COLS }, (_, col) => {
                  const gate = gateAt(q, col);
                  const cnots = cnotAt(q, col);
                  const isCtrl = cnots.some(op => op.control === q);
                  const isTgt  = cnots.some(op => op.target === q);
                  const isSpecial = ops.some(op => (op.type === "ORACLE" || op.type === "DIFFUSER") && op.col === col);
                  const specialOp = ops.find(op => (op.type === "ORACLE" || op.type === "DIFFUSER") && op.col === col);
                  return (
                    <div key={col} onClick={() => handleCellClick(q, col)} style={{
                      width: 42, height: 36, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      cursor: "pointer", position: "relative", zIndex: 1,
                      flexShrink: 0,
                    }}>
                      {gate ? (
                        <div onClick={e => removeOp(ops.indexOf(gate), e)} title="Remove" style={{
                          width: 32, height: 28,
                          background: `${GATE_DEFS[gate.type].color}14`,
                          border: `1px solid ${GATE_DEFS[gate.type].color}`,
                          borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 600, color: GATE_DEFS[gate.type].color,
                          cursor: "pointer", letterSpacing: 0,
                          boxShadow: `0 0 8px ${GATE_DEFS[gate.type].color}22`,
                        }}>{gate.type}</div>
                      ) : isCtrl ? (
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff6b6b", boxShadow: "0 0 6px #ff6b6b88" }} />
                      ) : isTgt ? (
                        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #ff6b6b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#ff6b6b", fontWeight: 700 }}>⊕</div>
                      ) : isSpecial && q === 0 ? (
                        <div style={{ width: 36, height: 28, background: "#f8961e11", border: "1px solid #f8961e44", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#f8961e", letterSpacing: 0 }}>
                          {specialOp?.type === "ORACLE" ? "ORCL" : "DIFF"}
                        </div>
                      ) : isSpecial ? (
                        <div style={{ width: 32, height: 1, background: "#f8961e22" }} />
                      ) : (
                        <div style={{ width: 32, height: 28, border: "1px dashed #0d1f1f", borderRadius: 3, opacity: 0.5 }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = "#1a3030"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = "#0d1f1f"}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button onClick={run} disabled={ops.length === 0 || playing} style={{
          background: ops.length === 0 ? "transparent" : "#00f5d4",
          border: `1px solid ${ops.length === 0 ? "#1a2a2a" : "#00f5d4"}`,
          color: ops.length === 0 ? "#333" : "#000",
          padding: "9px 20px", fontSize: 10, fontWeight: 700,
          letterSpacing: 1.5, borderRadius: 2, textTransform: "uppercase",
          transition: "all 0.15s",
          animation: playing ? "pulse 1s infinite" : "none",
        }}>{playing ? "RUNNING..." : "RUN"}</button>

        {snaps && (<>
          <button onClick={stepBack} disabled={step === 0} style={{
            background: "transparent", border: "1px solid #1a2a2a",
            color: step === 0 ? "#222" : "#555",
            padding: "9px 14px", fontSize: 12, borderRadius: 2,
          }}>◀</button>
          <button onClick={stepFwd} disabled={step >= (snaps.length - 1)} style={{
            background: "transparent", border: "1px solid #1a2a2a",
            color: step >= (snaps.length - 1) ? "#222" : "#555",
            padding: "9px 14px", fontSize: 12, borderRadius: 2,
          }}>▶</button>
        </>)}

        <button onClick={reset} style={{
          background: "transparent", border: "1px solid #1a2a2a",
          color: "#444", padding: "9px 16px", fontSize: 10,
          letterSpacing: 1, borderRadius: 2, marginLeft: "auto",
        }}>RESET</button>
      </div>

      {/* Results row */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start"}}>
        {/* Prob bars */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 10 }}>MEASUREMENT PROBABILITIES</div>
          <ProbBars probs={currentProbs} prevProbs={prevProbs} />
        </div>

        {/* Bloch sphere */}
        <div>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 10 }}>BLOCH SPHERE q0</div>
          <div style={{ background: "#040e0e", border: "1px solid #0a2020", borderRadius: 4, padding: 10, display: "inline-block" }}>
            <BlochSphere state={currentSnap ? currentSnap.state.slice(0, 2) : [[1,0],[0,0]]} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #0a1010", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontSize: 9, color: "#FFFFFF", letterSpacing: 1 }}>click cells to place · click gates to remove · ◀▶ to step through</div>
        <div style={{ fontSize: 9, color: "#FFFFFF", letterSpacing: 1 }}>superpose. v1</div>
      </div>
    </div>
  );
}
