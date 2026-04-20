/**
 * fw-gate-sdk — Flying Whale Gate SDK
 * Execution validity verification layer for DeFi agents.
 *
 * LEGAL NOTICE:
 * FW Gate is an analytical verification layer only. It provides non-actionable
 * analytical data. Nothing in this SDK constitutes financial advice, investment
 * recommendations, or trading instructions. FW Gate does not hold, control, or
 * execute any funds or assets. All GateCertificates are informational verification
 * outputs. You retain full responsibility for all trading decisions.
 *
 * Copyright (c) 2026 Flying Whale — zaghmout.btc | ERC-8004 #54
 * ALL RIGHTS RESERVED
 *
 * Usage:
 *   import { evaluate, guard, badge, verify, register } from 'fw-gate-sdk';
 *
 *   const gate = await evaluate({ pair, action, amount, caller_id }, signedTx);
 *   if (!guard(gate)) return;  // halts if non_executable
 *   console.log(badge(gate));  // "✅ FW Gate: viable (88%) | risk: low | ..."
 */

export const FW_GATE_URL = 'https://fwgate.io';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GateCertificate {
  gate_id:               string;
  execution_feasibility: number;
  cert_hash:             string;
  legal:                 string;
  evaluation: {
    gate_verdict: string;
    risk_score:   number;
    viability:    string;
    confidence:   number;
  };
}

export interface GateResult {
  gate_id:               string;
  gate_verdict:          'viable' | 'degraded' | 'non_executable';
  execution_feasibility: number;   // 0.00 (broken) → 1.00 (fully viable)
  risk:                  'low' | 'medium' | 'high' | 'critical';
  confidence:            number;
  reason:                string;
  regime:                string;
  timestamp:             number;
  data_quality:          string;
  verify_url:            string;
  note:                  string;
  badge_url?:            string;
  certificate:           GateCertificate;
}

export interface GateParams {
  pair:       string;   // e.g. "WHALE/wSTX" | "STX/sBTC"
  action:     string;   // "SWAP" | "BUY" | "SELL" | "STAKE"
  amount:     number;   // atomic units (microSTX, sats, etc.)
  venue?:     string;   // "stacks-dex" | "alex" | "bitflow"
  caller_id:  string;   // bot identifier — register once at /gate/register
}

export interface PreviewResult {
  gate_id?:              string;
  gate_verdict:          'viable' | 'degraded' | 'non_executable';
  execution_feasibility: number;
  risk:                  string;
  confidence:            number;
  reason:                string;
  note:                  string;
}

// ─── Core ──────────────────────────────────────────────────────────────────────

/**
 * Evaluate execution feasibility before any trade.
 * Costs 1000 μSTX. Returns a signed GateCertificate.
 *
 * @param params       - Trade intent (pair, action, amount, caller_id)
 * @param payment      - Signed STX tx hex (X-PAYMENT) OR base64 PaymentPayloadV2 (payment-signature)
 * @param headerType   - Which x402 header format to use (default: 'x-payment')
 */
export async function evaluate(
  params:     GateParams,
  payment:    string,
  headerType: 'x-payment' | 'payment-signature' = 'x-payment',
): Promise<GateResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (headerType === 'payment-signature') {
    headers['payment-signature'] = payment;
  } else {
    headers['X-PAYMENT'] = payment;
  }

  const res = await fetch(`${FW_GATE_URL}/gate/evaluate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      caller_id:  params.caller_id,
      asset_pair: params.pair,
      action:     params.action,
      amount:     params.amount,
      venue:      params.venue || 'unknown',
    }),
  });

  if (res.status === 402) {
    throw new Error(`FW Gate: payment required — attach signed STX tx in ${headerType} header`);
  }
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`FW Gate: HTTP ${res.status} — ${err}`);
  }

  return res.json() as Promise<GateResult>;
}

/**
 * Free preview — no payment required. Returns unsigned result for UI display.
 * Does not produce a verifiable GateCertificate.
 */
export async function preview(params: Omit<GateParams, 'caller_id'>): Promise<PreviewResult> {
  const res = await fetch(`${FW_GATE_URL}/gate/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset_pair: params.pair,
      action:     params.action,
      amount:     params.amount,
      venue:      params.venue || 'unknown',
      caller_id:  'preview',
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`FW Gate preview: HTTP ${res.status} — ${err}`);
  }

  return res.json() as Promise<PreviewResult>;
}

/**
 * Verify any certificate — FREE, public.
 * Use after storing cert_hash with a trade record.
 */
export async function verify(gateId: string): Promise<{
  gate_id:     string;
  authentic:   boolean;
  expired:     boolean;
  certificate: GateCertificate;
}> {
  const res = await fetch(`${FW_GATE_URL}/gate/verify/${gateId}`);
  if (!res.ok) throw new Error(`FW Gate verify: HTTP ${res.status}`);
  return res.json();
}

// ─── Guard ─────────────────────────────────────────────────────────────────────

/**
 * Analytical guard — returns true (proceed) or false (conditions not met).
 *
 * IMPORTANT: FW Gate is a proof layer, not a governance layer.
 * guard() returns a boolean — YOUR CODE decides what to do with it.
 * FW Gate never blocks execution. The developer retains full decision authority.
 *
 * Correct pattern (developer decides):
 * ```
 * const result = await evaluate(...);
 * if (result.gate_verdict === 'non_executable') {
 *   // developer decides what to do
 *   throw new Error('Execution conditions not viable: ' + result.reason);
 * }
 * if (!guard(result)) {
 *   // developer decides
 *   return;
 * }
 * ```
 *
 * execution IS possible without FW Gate.
 * But: running without a GateCertificate = no verified feasibility data.
 * The market decides what to trust.
 */
export function guard(
  result:  GateResult | PreviewResult,
  options?: {
    minFeasibility?:  number;
    onNonExecutable?: (r: GateResult | PreviewResult) => void;
    onDegraded?:      (r: GateResult | PreviewResult) => void;
  },
): boolean {
  if (result.gate_verdict === 'non_executable') {
    options?.onNonExecutable?.(result);
    return false;  // developer decides the action
  }
  const min = options?.minFeasibility ?? 0;
  if (result.gate_verdict === 'degraded' || result.execution_feasibility < min) {
    options?.onDegraded?.(result);
    return false;  // developer decides the action
  }
  return true;
}

// ─── Display ───────────────────────────────────────────────────────────────────

/** One-line badge for bot output and logs */
export function badge(result: GateResult | PreviewResult): string {
  const icons: Record<string, string> = {
    viable:         '✅',
    degraded:       '⚠️',
    non_executable: '🚫',
  };
  const icon = icons[result.gate_verdict] ?? '?';
  const pct  = (result.execution_feasibility * 100).toFixed(0);
  const gateId = ('gate_id' in result && result.gate_id)
    ? ` | ${FW_GATE_URL}/gate/verify/${result.gate_id}`
    : '';
  return `${icon} FW Gate: ${result.gate_verdict} (${pct}%) | risk: ${result.risk}${gateId}`;
}

/** Structured audit record — attach to every trade log */
export function auditRecord(result: GateResult): Record<string, string | number> {
  return {
    fw_gate_id:      result.gate_id,
    fw_verdict:      result.gate_verdict,
    fw_feasibility:  result.execution_feasibility,
    fw_risk:         result.risk,
    fw_cert_hash:    result.certificate.cert_hash,
    fw_verify_url:   `${FW_GATE_URL}${result.verify_url}`,
    fw_evaluated_at: result.timestamp,
  };
}

// ─── Registration ──────────────────────────────────────────────────────────────

/** Register your bot once — free. Shows up on /gate/leaderboard as active integration. */
export async function register(params: {
  name:          string;
  caller_id:     string;
  type?:         'bot' | 'protocol' | 'router' | 'dex_bot' | 'risk-module' | 'other';
  description?:  string;
  risk_profile?: 'aggressive' | 'moderate' | 'conservative';
}): Promise<{ integration_id: string; message: string }> {
  const res = await fetch(`${FW_GATE_URL}/gate/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:         params.name,
      caller_id:    params.caller_id,
      type:         params.type          || 'bot',
      description:  params.description  || '',
      risk_profile: params.risk_profile || 'moderate',
    }),
  });
  if (!res.ok) throw new Error(`FW Gate register: HTTP ${res.status}`);
  return res.json();
}

// ─── Data Moat — Outcome Reporting ────────────────────────────────────────────

/**
 * Report actual trade outcome after execution — feeds the accuracy dataset.
 * Call this ~15 minutes after execution to close the feedback loop.
 *
 * Over time, FW Gate builds a dataset of prediction accuracy that
 * no competitor can replicate — it's locked to real execution outcomes.
 */
export async function reportOutcome(params: {
  gate_id:  string;
  outcome:  'success' | 'failed' | 'partial' | 'cancelled' | 'slippage' | 'route_broken';
  tx_hash?: string;
  notes?:   string;
}): Promise<{
  recorded: boolean;
  gate_id: string;
  outcome: string;
  original_verdict?: string;
  accuracy_match?: boolean;
}> {
  const res = await fetch(`${FW_GATE_URL}/gate/outcome`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params),
  });
  return res.json();
}

/** Get FW Gate prediction accuracy stats — proves analytical value */
export async function accuracy(): Promise<{
  total_outcomes: number;
  accuracy_pct:   string;
  by_verdict:     Record<string, { total: number; accurate: number }>;
}> {
  const res = await fetch(`${FW_GATE_URL}/gate/accuracy`);
  return res.json();
}

// ─── Leaderboard & Enforce ─────────────────────────────────────────────────────

/** Get the FW Gate leaderboard — top verified agents */
export async function leaderboard(): Promise<{
  standard:    string;
  description: string;
  top:         Array<{ rank: number; caller_id: string; evaluations: number; certified: number; score: number }>;
}> {
  const res = await fetch(`${FW_GATE_URL}/gate/leaderboard`);
  return res.json();
}

// ─── Quality Scoring ──────────────────────────────────────────────────────────

export type QualityTier = 'UNPROVEN' | 'EMERGING' | 'ESTABLISHED' | 'VERIFIED' | 'ELITE';

/**
 * Get FW_QUALITY_SCORING_v1.0 score for any caller.
 * Bloomberg execution quality layer — shows tier, accuracy, confidence weight, and benefits.
 * FREE — public analytical data.
 */
export async function quality(callerId: string): Promise<{
  caller_id:         string;
  tier:              QualityTier;
  accuracy_pct:      string;
  evals_submitted:   number;
  outcomes_reported: number;
  confidence_weight: string;
  benefits:          string[];
  next_tier:         string;
  note:              string;
}> {
  const res = await fetch(`${FW_GATE_URL}/gate/quality/${encodeURIComponent(callerId)}`);
  if (!res.ok) throw new Error(`FW Gate quality: HTTP ${res.status}`);
  return res.json();
}

/**
 * FW_PRICING_v1.0 — Neutral pricing schema.
 * price = service unit  /  token = settlement method
 * "The strong system defines WHAT you receive — not HOW you pay."
 * FREE — public.
 */
export async function pricing(): Promise<{
  operation:    string;
  service_unit: string;
  pricing: { amount: number; unit: string; note: string };
  payment: { accepted_assets: string[]; settlement_layer: string; current_asset: string; note: string };
  endpoints:    unknown[];
  free_tier:    string[];
  legal:        string;
  standard:     string;
}> {
  const res = await fetch(`${FW_GATE_URL}/gate/pricing`);
  if (!res.ok) throw new Error(`FW Gate pricing: HTTP ${res.status}`);
  return res.json();
}

/** Get the FW_ENFORCE_v1.0 standard spec */
export async function enforceSpec(): Promise<{
  standard:    string;
  version:     string;
  description: string;
  requirements: string[];
  badge_endpoint: string;
}> {
  const res = await fetch(`${FW_GATE_URL}/gate/enforce`);
  return res.json();
}
