# fw-gate-sdk

**Market Safety Layer for DeFi Agents**

[![npm](https://img.shields.io/npm/v/fw-gate-sdk)](https://www.npmjs.com/package/fw-gate-sdk)
[![License](https://img.shields.io/badge/license-FW--Gate-orange)](./LICENSE)
[![FW Gate](https://img.shields.io/badge/FW_Gate-v1.0-f7931a)](https://fwgate.io)
[![FW_ENFORCE](https://img.shields.io/badge/FW__ENFORCE-v1.0-red)](https://fwgate.io/gate/enforce)

> ⚖️ **LEGAL NOTICE**: FW Gate is an **analytical verification layer only**. It provides non-actionable analytical data. Nothing in this SDK constitutes financial advice, investment recommendations, or trading instructions. FW Gate does not hold, control, or execute any funds or assets. You retain full responsibility for all trading decisions.

---

## The Standard

> **"Execution without GateCertificate is unverified."**

FW Gate is not a tool. It's a standard.

Any DeFi agent, router, or bot that executes trades should carry a signed **GateCertificate** — or its execution runs without verified feasibility data.

```
if (!fw_certificate) reject_execution()   // FW_ENFORCE_v1.0
```

A GateCertificate proves:
- `gate_verdict`: `viable` | `degraded` | `non_executable`  
- `execution_feasibility`: `0.00` → `1.00`  
- `cert_hash`: permanently verifiable — `GET fwgate.io/gate/verify/{id}`

**FW Gate does NOT**:
- Give financial advice
- Execute trades
- Hold or control funds
- Make investment recommendations

---

## Install

```bash
npm install fw-gate-sdk
```

---

## Quick Start

```typescript
import { evaluate, guard, badge, auditRecord, reportOutcome } from 'fw-gate-sdk';

// Paid evaluation — returns signed GateCertificate (1000 μSTX)
const cert = await evaluate(
  { pair: 'WHALE/wSTX', action: 'SWAP', amount: 1_000_000, caller_id: 'my-bot' },
  signedPaymentTx,
);

console.log(badge(cert));
// ✅ FW Gate: viable (88%) | risk: low | https://fwgate.io/gate/verify/fw-gate-xxx

// Developer decides — FW Gate never blocks, it informs
if (cert.gate_verdict === 'non_executable') {
  // your choice:
  throw new Error(`Execution conditions not viable: ${cert.reason}`);
  // or: return; / log it / alert the user
}

if (!guard(cert)) {
  // your choice for degraded conditions
  return;
}

// Execute your trade here
// ...

// 15 min later — report outcome (builds the accuracy dataset)
await reportOutcome({ gate_id: cert.gate_id, outcome: 'success', tx_hash: txId });

// Attach to trade log
const audit = auditRecord(cert);
// { fw_gate_id, fw_verdict, fw_feasibility, fw_cert_hash, fw_verify_url, ... }
```

**Embed in any web page:**
```html
<iframe src="https://fwgate.io/widget/fw-gate-xxx" width="320" height="80"
  frameborder="0" scrolling="no" title="FW Gate Certificate"></iframe>
```

---

## API Reference

### `preview(params)` — Free
```typescript
const result = await preview({
  pair:   'STX/sBTC',   // trading pair
  action: 'SWAP',       // SWAP | BUY | SELL | STAKE
  amount: 1_000_000,    // in atomic units (microSTX)
  venue?: 'alex',       // optional: stacks-dex | alex | bitflow
});
```
Returns `PreviewResult` — unsigned, for display only.

---

### `evaluate(params, payment)` — 1000 μSTX
```typescript
const cert = await evaluate(
  { pair, action, amount, caller_id: 'my-bot', venue?: 'alex' },
  signedPaymentTxHex,          // X-PAYMENT header (default)
  'payment-signature',         // optional: use x402 v2 header instead
);
```
Returns signed `GateResult` with `certificate.cert_hash`.

---

### `guard(result, options?)` — Analytics Gate
```typescript
if (!guard(result, {
  minFeasibility: 0.6,           // optional: halt below 60%
  onNonExecutable: (r) => log(r),
  onDegraded:      (r) => warn(r),
})) return;
```
Returns `true` = proceed, `false` = halt. **Analytical only — not financial advice.**

---

### `verify(gateId)` — Free, Public
```typescript
const check = await verify('fw-gate-abc123');
// { gate_id, authentic: true, expired: false, certificate }
```

---

### `register(params)` — Free
```typescript
await register({
  name:        'my-arbitrage-bot',
  caller_id:   'arb-bot-v1',
  type:        'bot',
  description: 'STX/WHALE arbitrage',
});
```
Shows up in the FW Gate leaderboard at [fwgate.io/gate/leaderboard](https://fwgate.io/gate/leaderboard).

---

### `badge(result)` — Display
```typescript
badge(result)
// "✅ FW Gate: viable (88%) | risk: low | https://fwgate.io/gate/verify/fw-gate-xxx"
```

### `auditRecord(result)` — Logging
```typescript
auditRecord(result)
// { fw_gate_id, fw_verdict, fw_feasibility, fw_risk, fw_cert_hash, fw_verify_url, fw_evaluated_at }
```

---

## Verdict Reference

| Verdict | Meaning | Action |
|---------|---------|--------|
| `viable` | Execution path confirmed valid | Proceed |
| `degraded` | Partial issues — elevated risk | Proceed with caution |
| `non_executable` | Path broken or invalid | **Halt** |

---

## FW_ENFORCE_v1.0 — Social Enforcement

```typescript
import { enforceSpec, leaderboard } from 'fw-gate-sdk';

const spec = await enforceSpec();
// { standard: 'FW_ENFORCE_v1.0', rule: 'if (!fw_certificate) reject_execution()' }

const board = await leaderboard();
// { top: [{ rank, caller_id, evaluations, certified, score }] }
```

**Three layers of social enforcement:**

| Layer | URL | Effect |
|-------|-----|--------|
| ✅ Verify page | `fwgate.io/gate/verify/{id}` | Proof that execution was assessed |
| ⛔ Shaming page | `fwgate.io/gate/unverified?pair=X&caller_id=Y` | "This execution was not gate-verified" |
| 🏆 Leaderboard | `fwgate.io/gate/leaderboard` | Verified agents ranked publicly |

**Embed badge in your bot's README or UI:**
```html
<!-- Static badge -->
<img src="https://fwgate.io/gate/badge/{gateId}.svg" />

<!-- Live widget (shows real-time verdict) -->
<script src="https://fwgate.io/gate/widget.js" data-gate-id="fw-gate-xxx"></script>
```

---

## Pricing

| Endpoint | Cost |
|----------|------|
| `/gate/preview` | **Free** |
| `/gate/evaluate` | **1000 μSTX** |
| `/gate/verify/{id}` | **Free** |
| `/gate/register` | **Free** |
| `/gate/leaderboard` | **Free** |

Payments handled via [x402 protocol](https://x402.org) — automatic micropayments on Stacks.

---

## Data Moat — Accuracy Tracking

FW Gate builds a dataset no competitor can replicate: prediction accuracy matched against real trade outcomes.

```typescript
import { reportOutcome, accuracy } from 'fw-gate-sdk';

// 15 minutes after execution — close the loop
await reportOutcome({
  gate_id: cert.gate_id,
  outcome: 'success',   // success | failed | partial | cancelled | slippage | route_broken
  tx_hash: '0x...',
});

// See prediction accuracy stats
const stats = await accuracy();
// { accuracy_pct: '87%', by_verdict: { viable: { total: 1200, accurate: 1052 }, ... } }
```

Every reported outcome makes the analytical model stronger. The dataset is locked to real execution history — not synthetic.

---

## The ISO Principle

FW Gate does not block execution. It cannot. You can execute without it.

But:
- Without FW Gate = no verified feasibility data
- Without FW Gate = not on the leaderboard  
- Without FW Gate = the market doesn't know if your execution was valid

Like ISO standards: optional in theory, required in practice.

> *"Execution is possible without FW Gate. But economically, running without a GateCertificate is running without proof."*

---

## Legal

FW Gate is an **analytics and verification layer only**:

- ✅ Analytical output — execution validity data
- ✅ Verification system — cert_hash provable on-chain
- ❌ Not financial advice
- ❌ Not investment recommendations  
- ❌ No custody of funds
- ❌ No execution control

**zaghmout.btc | ERC-8004 #54 | Flying Whale**  
IP registered on Stacks mainnet.

---

© 2026 Flying Whale — ALL RIGHTS RESERVED  
[fwgate.io](https://fwgate.io) · [npm](https://www.npmjs.com/package/fw-gate-sdk)
