# fw-gate-sdk

**Execution Validity Verification Layer for DeFi Agents**

[![npm](https://img.shields.io/npm/v/fw-gate-sdk)](https://www.npmjs.com/package/fw-gate-sdk)
[![License](https://img.shields.io/badge/license-FW--Gate-orange)](./LICENSE)
[![FW Gate](https://img.shields.io/badge/FW_Gate-v1.0-f7931a)](https://fwgate.io)

> ⚖️ **LEGAL NOTICE**: FW Gate is an **analytical verification layer only**. It provides non-actionable analytical data. Nothing in this SDK constitutes financial advice, investment recommendations, or trading instructions. FW Gate does not hold, control, or execute any funds or assets. You retain full responsibility for all trading decisions.

---

## What is FW Gate?

FW Gate answers one question before any agent trade executes:

> *"Is this execution actually viable?"*

It evaluates on-chain pool reserves, execution path integrity, market regime, and demand signals — then returns a signed **GateCertificate** with:

- `gate_verdict`: `viable` | `degraded` | `non_executable`  
- `execution_feasibility`: `0.00` → `1.00`  
- `cert_hash`: publicly verifiable on-chain  

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
import { preview, evaluate, guard, badge, auditRecord } from 'fw-gate-sdk';

// Free preview (no payment) — for UI display
const result = await preview({
  pair:   'WHALE/wSTX',
  action: 'SWAP',
  amount: 1_000_000,
});

console.log(badge(result));
// ✅ FW Gate: viable (88%) | risk: low

// Guard before execution
if (!guard(result)) {
  console.log('Execution halted by FW Gate analysis');
  return;
}

// Paid evaluation — returns signed GateCertificate (1000 μSTX)
const cert = await evaluate(
  { pair: 'WHALE/wSTX', action: 'SWAP', amount: 1_000_000, caller_id: 'my-bot' },
  signedPaymentTx,
);

// Attach to trade log
const audit = auditRecord(cert);
// { fw_gate_id, fw_verdict, fw_feasibility, fw_risk, fw_cert_hash, ... }
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

## FW_ENFORCE_v1.0

Any agent executing DeFi trades without a GateCertificate is running without verified validity data.

```typescript
import { enforceSpec, leaderboard } from 'fw-gate-sdk';

const spec = await enforceSpec();
// { standard: 'FW_ENFORCE_v1.0', requirements: [...] }

const board = await leaderboard();
// { top: [{ rank, caller_id, evaluations, certified, score }] }
```

Embed the badge in your bot's README:
```
GET https://fwgate.io/gate/badge/{gateId}.svg
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
