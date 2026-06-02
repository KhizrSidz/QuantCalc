# QuantCalc.

> A browser-based quantum circuit simulator. Built from scratch. Built in public.

![superpose v1](https://img.shields.io/badge/version-1.0-00f5d4?style=flat-square&labelColor=020608)
![built with](https://img.shields.io/badge/built%20with-React-f72585?style=flat-square&labelColor=020608)
![license](https://img.shields.io/badge/license-MIT-4361ee?style=flat-square&labelColor=020608)

---

## What is this

QuantCalc. is a quantum circuit simulator that runs entirely in the browser. Place quantum gates, build circuits, hit run, and watch the probability of each measurement outcome animate in real time — step by step, with explanations.

No installation. No physics degree. No prior knowledge required.

I'm a Nanotechnology Engineering student at the University of Waterloo. Quantum computing kept coming up in my coursework, and I decided to stop reading about it and start building it. The math under the hood is implemented from scratch — no wrapping of Qiskit or other libraries. Real statevector simulation in JavaScript.

This is a build-in-public project. Every version ships with an update post.

---

## Demo

**Try these presets in order:**

1. **Bell State** — two qubits become entangled. You always measure `00` or `11`, never `01` or `10`. This is entanglement.
2. **Grover's Search** — watch interference amplify a single marked state from 12.5% to near 100%. This is quantum advantage.
3. **GHZ State** — three qubits all entangled together.

---

## How it works

### The math

A quantum system of n qubits is described by a **statevector** — a list of 2^n complex numbers called amplitudes. Squaring each amplitude gives the probability of measuring that outcome.

```
|ψ⟩ = α|00⟩ + β|01⟩ + γ|10⟩ + δ|11⟩
where |α|² + |β|² + |γ|² + |δ|² = 1
```

**Applying a gate** = multiplying the state vector by a matrix.

**Hadamard gate** (creates superposition):
```
H = (1/√2) × [[1,  1],
               [1, -1]]

H|0⟩ = [0.707, 0.707]  →  50% chance of 0, 50% chance of 1
```

**CNOT gate** (creates entanglement):
```
Flips the target qubit if and only if the control qubit is |1⟩
```

**Bell state from scratch:**
```
Start:       [1, 0, 0, 0]     → |00⟩ with 100% certainty
After H(q0): [0.707, 0, 0.707, 0]
After CNOT:  [0.707, 0, 0, 0.707]
Measure:     |00⟩ = 50%,  |11⟩ = 50%
```

That is two matrix multiplications producing quantum entanglement.

### Grover's algorithm

Grover's finds a marked item in an unsorted list of N items in √N steps.  
Classical: N/2 steps on average. For 1,000,000 items: 500,000 vs 1,000.

The circuit:
1. **H on all qubits** — superposition, all answers equally likely at 1/N
2. **Oracle** — flips the phase of the correct answer (invisible at measurement, but sets up interference)
3. **Diffuser** — inverts all amplitudes about their average, amplifying the marked state
4. Repeat oracle + diffuser ~√N times
5. Measure — correct answer has near-100% probability

---

## Gates

| Gate | What it does |
|------|-------------|
| **H** | Creates superposition from \|0⟩ or \|1⟩ |
| **X** | Quantum NOT — flips \|0⟩ to \|1⟩ |
| **Y** | Flip + phase rotation |
| **Z** | Flips phase of \|1⟩ — causes interference in superposition |
| **S** | 90° phase rotation |
| **T** | 45° phase rotation — with H and CNOT forms a universal gate set |
| **CNOT** | Two-qubit: flips target if control is \|1⟩. Creates entanglement. |

---

## How to use

1. **Select a gate** from the gate palette (H, X, Y, Z, S, T, CNOT)
2. **Click a cell** on the circuit grid to place it on that qubit and column
3. **For CNOT**: click the control qubit first, then the target qubit
4. **Click a placed gate** to remove it
5. **Hit RUN** — probabilities animate step by step
6. **Use ◀ ▶** to step through the circuit manually
7. **SHARE CIRCUIT** encodes your circuit into a URL you can send to anyone

---

## What's implemented (V1)

- [x] 3-qubit statevector simulation (8 possible states)
- [x] Gates: H, X, Y, Z, S, T, CNOT
- [x] Grover's search algorithm with oracle + diffuser
- [x] Step-by-step animation with labels
- [x] Explanation panel for presets (what each step does in plain English)
- [x] Bloch sphere visualisation for q0
- [x] Shareable circuit URLs (circuit encoded in query string)
- [x] Presets: Bell State, Superposition, Grover's Search, GHZ State, Pauli-X
- [x] Mobile-responsive layout

---

## Roadmap

### V2 — Step-through mode
- [ ] Manual step-through with per-gate explanation text
- [ ] Phase visualisation (show complex amplitudes, not just probabilities)
- [ ] Deutsch-Jozsa algorithm preset
- [ ] Quantum teleportation preset
- [ ] Accurate multi-qubit Bloch sphere

### V3 — Scale
- [ ] Up to 10 qubits (1024 states)
- [ ] Qiskit export — generate Python code to run your circuit on real IBM quantum hardware
- [ ] Circuit gallery
- [ ] Embeddable widget

### V4 — Product
- [ ] User accounts and saved circuits
- [ ] Community circuit sharing
- [ ] Curriculum mode — guided lessons

---

## Technical notes

**Why JavaScript, not Python?**

Browser-first. Zero setup for anyone who wants to try it. The state vector math for 3 qubits (8 complex numbers) is trivial for a modern browser.

**Scaling limits**

Statevector simulation requires storing and operating on 2^n complex numbers. At 3 qubits: 8 numbers. At 10 qubits: 1,024. At 30 qubits: 1 billion. Classical simulation of large quantum systems is fundamentally hard — that's the whole point of building real quantum hardware.

**What "simulate" means**

This simulator runs the same linear algebra that describes what a real quantum computer would do. The outputs are exactly what a real quantum computer would produce (in expectation). It does not model noise, decoherence, or gate error — real quantum hardware is noisy, this is ideal.

---

## Stack

- React (functional components, hooks)
- Vanilla CSS-in-JS
- IBM Plex Mono (typography)
- Canvas API (Bloch sphere)
- Zero external dependencies for the math engine

---

## Run locally

```bash
git clone https://github.com/khizr/superpose
cd superpose
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Competitors

| Tool | Strengths | Weaknesses |
|------|-----------|------------|
| IBM Quantum Composer | Real hardware, professional | Complex UI, requires account |
| Quirk | Open source, visual | Dated, no mobile, no explanations |
| Qiskit | Extremely powerful | Python only, no visual interface |
| **QuantCalc.** | Mobile-friendly, step-by-step explanations, built in public | Early stage, 3 qubits only (for now) |

---

## Background

I study Nanotechnology Engineering at the University of Waterloo. My coursework covers semiconductor physics, materials characterisation, and quantum mechanics at the device level — so I understand the physical layer of what quantum computers are made of.

This project came from wanting to understand the computational layer from the same first-principles perspective. Building the math from scratch (rather than wrapping a library) forced me to actually understand what the state vector is, what a gate does, and why Grover's works.

Other projects: [MasjidOS](https://github.com/khizr/masjidos) · [Quarry](https://github.com/khizr/quarry) · [IntentReview](https://github.com/khizr/intentreview)

---

## License

MIT — use it, fork it, build on it.

---

*QuantCalc. — built in public · follow the journey*
