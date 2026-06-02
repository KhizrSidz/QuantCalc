from qiskit import QuantumCircuit
from qiskit.transpiler import generate_preset_pass_manager
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
from matplotlib import pyplot as plt

# ── 1. CONNECT TO IBM ───────────────────────────────────────────────────────
# First time only: save your credentials
# Get your token from https://quantum.ibm.com → Account → API Token
#
# QiskitRuntimeService.save_account(
#     channel="ibm_quantum",
#     token="PASTE_YOUR_TOKEN_HERE",
#     overwrite=True
# )

service = QiskitRuntimeService()
backend = service.least_busy(operational=True, simulator=False, min_num_qubits=3)
print(f"Running on: {backend.name}")

# ── 2. BUILD GROVER'S CIRCUIT ────────────────────────────────────────────────
# This is the same circuit as superpose. — searching for |101⟩ (index 5)
# Qiskit uses little-endian bit ordering:
#   qubit 0 = rightmost bit, qubit 2 = leftmost bit
#   so |101⟩ in superpose. = q2=1, q1=0, q0=1 in Qiskit

qc = QuantumCircuit(3, 3)

# ── STEP 1: Superposition ──────────────────────────────────────────────────
# Put all 3 qubits in superposition — all 8 states equally likely at 12.5%
qc.h([0, 1, 2])
qc.barrier(label="superposition")

# ── STEP 2: Oracle (iteration 1) ──────────────────────────────────────────
# Marks |101⟩ by flipping its phase
# |101⟩ means q2=1, q1=0, q0=1
# To make CCNOT fire on |101⟩: flip q1 (so it becomes 1), apply CCX, flip back
qc.x(1)           # q1: 0 → 1 temporarily
qc.ccx(0, 1, 2)   # CCX fires when q0=1, q1=1, q2=1 — flips phase of |101⟩
qc.x(1)           # q1: restore
qc.barrier(label="oracle 1")

# ── STEP 3: Diffuser (iteration 1) ─────────────────────────────────────────
# Inverts amplitudes about their average → amplifies marked state
qc.h([0, 1, 2])
qc.x([0, 1, 2])
qc.ccx(0, 1, 2)
qc.x([0, 1, 2])
qc.h([0, 1, 2])
qc.barrier(label="diffuser 1")

# ── STEP 4: Oracle (iteration 2) ──────────────────────────────────────────
qc.x(1)
qc.ccx(0, 1, 2)
qc.x(1)
qc.barrier(label="oracle 2")

# ── STEP 5: Diffuser (iteration 2) ─────────────────────────────────────────
qc.h([0, 1, 2])
qc.x([0, 1, 2])
qc.ccx(0, 1, 2)
qc.x([0, 1, 2])
qc.h([0, 1, 2])
qc.barrier(label="diffuser 2")

# ── STEP 6: Measure ────────────────────────────────────────────────────────
qc.measure([0, 1, 2], [0, 1, 2])

# Draw the circuit
print("\nCircuit diagram:")
print(qc.draw("text"))
qc.draw("mpl")
plt.savefig("grover_circuit.png", dpi=150, bbox_inches="tight")
plt.show()

# ── 3. TRANSPILE FOR HARDWARE ────────────────────────────────────────────────
# Real quantum hardware has limited connectivity — transpiler remaps gates
pm = generate_preset_pass_manager(backend=backend, optimization_level=1)
transpiled = pm.run(qc)
print(f"\nOriginal gates:    {qc.count_ops()}")
print(f"Transpiled gates:  {transpiled.count_ops()}")

# ── 4. RUN ON IBM ────────────────────────────────────────────────────────────
SHOTS = 1024  # number of times to run the circuit
sampler = Sampler(backend)
job = sampler.run([transpiled], shots=SHOTS)
print(f"\nJob ID: {job.job_id()}")
print("Waiting for results... (may take a few minutes on real hardware)")

result = job.result()
counts = result[0].data.c.get_counts()

# ── 5. DISPLAY RESULTS ───────────────────────────────────────────────────────
print("\n── Results ─────────────────────────────────────")
print(f"{'State':<10} {'Count':<8} {'Probability':<12} Bar")
print("─" * 50)

# Sort by count descending
for state, count in sorted(counts.items(), key=lambda x: -x[1]):
    prob = count / SHOTS
    bar = "█" * int(prob * 40)
    # Qiskit returns little-endian, reverse for display to match superpose.
    state_display = state[::-1]
    marker = " ← MARKED (|101⟩)" if state_display == "101" else ""
    print(f"|{state_display}⟩  {count:<8} {prob*100:.1f}%        {bar}{marker}")

print("─" * 50)

# The answer
top_state = max(counts, key=counts.get)[::-1]
top_prob = max(counts.values()) / SHOTS
print(f"\nMost measured state: |{top_state}⟩ at {top_prob*100:.1f}%")

if top_state == "101":
    print("✓ Correct — Grover's found |101⟩")
    print(f"  superpose. simulator predicted ~97%")
    print(f"  Real hardware measured {top_prob*100:.1f}% (noise causes the gap)")
else:
    print(f"✗ Unexpected result — hardware noise may have interfered")
    print(f"  Try running again or use a less busy backend")

# ── 6. PLOT RESULTS ──────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))
fig.patch.set_facecolor("#020608")
ax.set_facecolor("#040e0e")

states = [s[::-1] for s in sorted(counts.keys())]
probs  = [counts.get(s[::-1], 0) / SHOTS for s in states]
colors = ["#00f5d4" if s == "101" else "#1a3a3a" for s in states]

bars = ax.bar(states, probs, color=colors, edgecolor="#0a2020", linewidth=0.5)

ax.set_xlabel("Measurement Outcome", color="#888", fontsize=11)
ax.set_ylabel("Probability", color="#888", fontsize=11)
ax.set_title("Grover's Search — IBM Quantum Hardware vs superpose. Simulator",
             color="#e0e0e0", fontsize=12, pad=12)
ax.tick_params(colors="#555")
ax.spines[:].set_color("#0a2020")
ax.set_ylim(0, 1)

# Simulator prediction line
ax.axhline(y=0.97, color="#f8961e", linestyle="--", linewidth=1, alpha=0.5,
           label="superpose. prediction (~97%)")
ax.legend(facecolor="#040e0e", edgecolor="#0a2020", labelcolor="#888", fontsize=9)

# Label the marked state
for bar, state, prob in zip(bars, states, probs):
    if state == "101":
        ax.text(bar.get_x() + bar.get_width()/2, prob + 0.02,
                f"{prob*100:.1f}%", ha="center", color="#00f5d4", fontsize=10, fontweight="bold")

plt.tight_layout()
plt.savefig("grover_results.png", dpi=150, bbox_inches="tight", facecolor="#020608")
plt.show()

print("\nSaved: grover_circuit.png, grover_results.png")
