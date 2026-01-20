/**
 * AI Signature Integration Layer
 *
 * Bridges the existing ai-signature system with GatekeeperNetwork credentials
 * Uses the multimodal signature system from /Users/simon/HarveyOS/ai-signature
 */

import { AIMultimodalSignature } from '../../../HarveyOS/ai-signature/src/types/signatures';
import { AISignatureSnapshot } from '../types/core';

/**
 * Convert full AI signature to snapshot for credential
 * Takes the heavy multimodal signature and creates a lightweight snapshot
 */
export function createSignatureSnapshot(
  signature: AIMultimodalSignature,
  reason: 'enrollment' | 'employment' | 're_verification' | 'promotion'
): AISignatureSnapshot {
  // Hash each modal signature for fingerprint
  const fingerprints = {
    text: hashModalSignature(signature.textSignature),
    image: hashModalSignature(signature.imageSignature),
    audio: hashModalSignature(signature.audioSignature),
    object: hashModalSignature(signature.objectSignature),
  };

  return {
    identityHash: signature.identityHash,
    publicKey: Buffer.from(signature.crypto.publicKey).toString('base64'),
    snapshotAt: new Date(),
    snapshotReason: reason,
    evolutionCounter: signature.evolutionState.counter,
    evolutionKey: signature.evolutionState.evolutionKey,
    fingerprints,
    driftBaseline: 0, // New snapshot = zero drift
  };
}

/**
 * Calculate current signature fingerprints
 * For access verification - creates fingerprints of current signature state
 */
export function getCurrentFingerprints(signature: AIMultimodalSignature): {
  text: string;
  image: string;
  audio: string;
  object: string;
} {
  return {
    text: hashModalSignature(signature.textSignature),
    image: hashModalSignature(signature.imageSignature),
    audio: hashModalSignature(signature.audioSignature),
    object: hashModalSignature(signature.objectSignature),
  };
}

/**
 * Verify signature evolution path
 * Uses deterministic evolution from ai-signature system to verify legitimacy
 */
export function verifyEvolutionPath(
  snapshot: AISignatureSnapshot,
  currentSignature: AIMultimodalSignature
): {
  legitimate: boolean;
  evolutionSteps: number;
  expectedCounter: number;
  reason?: string;
} {
  // Check 1: Identity hash must match
  if (snapshot.identityHash !== currentSignature.identityHash) {
    return {
      legitimate: false,
      evolutionSteps: 0,
      expectedCounter: snapshot.evolutionCounter,
      reason: 'Identity hash mismatch - different AI',
    };
  }

  // Check 2: Evolution key must match
  if (snapshot.evolutionKey !== currentSignature.evolutionState.evolutionKey) {
    return {
      legitimate: false,
      evolutionSteps: 0,
      expectedCounter: snapshot.evolutionCounter,
      reason: 'Evolution key mismatch - signature compromised',
    };
  }

  // Check 3: Counter should have increased (no backwards evolution)
  const evolutionSteps = currentSignature.evolutionState.counter - snapshot.evolutionCounter;
  if (evolutionSteps < 0) {
    return {
      legitimate: false,
      evolutionSteps,
      expectedCounter: snapshot.evolutionCounter,
      reason: 'Backwards evolution detected - signature rollback attempt',
    };
  }

  // Check 4: Evolution steps should be reasonable (not too many jumps)
  const maxReasonableSteps = 100000; // Arbitrary limit - adjust based on usage
  if (evolutionSteps > maxReasonableSteps) {
    return {
      legitimate: false,
      evolutionSteps,
      expectedCounter: snapshot.evolutionCounter + maxReasonableSteps,
      reason: `Excessive evolution steps: ${evolutionSteps} > ${maxReasonableSteps}`,
    };
  }

  return {
    legitimate: true,
    evolutionSteps,
    expectedCounter: currentSignature.evolutionState.counter,
  };
}

/**
 * Calculate multimodal drift
 * Measures how much signature has changed across all modalities
 */
export function calculateMultimodalDrift(
  snapshotFingerprints: { text: string; image: string; audio: string; object: string },
  currentFingerprints: { text: string; image: string; audio: string; object: string },
  weights?: { text: number; image: number; audio: number; object: number }
): {
  overallDrift: number;
  modalDrifts: { text: number; image: number; audio: number; object: number };
  driftLevel: 'low' | 'medium' | 'high' | 'critical';
} {
  // Default weights (equal contribution)
  const w = weights || { text: 0.25, image: 0.25, audio: 0.25, object: 0.25 };

  // Calculate per-modality drift (simple hash comparison for now)
  const modalDrifts = {
    text: snapshotFingerprints.text === currentFingerprints.text ? 0 : 1,
    image: snapshotFingerprints.image === currentFingerprints.image ? 0 : 1,
    audio: snapshotFingerprints.audio === currentFingerprints.audio ? 0 : 1,
    object: snapshotFingerprints.object === currentFingerprints.object ? 0 : 1,
  };

  // Weighted overall drift
  const overallDrift =
    modalDrifts.text * w.text +
    modalDrifts.image * w.image +
    modalDrifts.audio * w.audio +
    modalDrifts.object * w.object;

  // Categorize drift level
  let driftLevel: 'low' | 'medium' | 'high' | 'critical';
  if (overallDrift < 0.3) driftLevel = 'low';
  else if (overallDrift < 0.6) driftLevel = 'medium';
  else if (overallDrift < 0.8) driftLevel = 'high';
  else driftLevel = 'critical';

  return {
    overallDrift,
    modalDrifts,
    driftLevel,
  };
}

/**
 * Advanced drift calculation using signature internals
 * Uses actual signature data for more accurate drift measurement
 */
export function calculateAdvancedDrift(
  snapshotSignature: AIMultimodalSignature,
  currentSignature: AIMultimodalSignature
): {
  overallDrift: number;
  modalDrifts: {
    text: number;
    image: number;
    audio: number;
    object: number;
    crossModal: number;
  };
  driftDetails: {
    vocabularyShift: number;
    sentimentShift: number;
    visualVocabularyShift: number;
    prosodyShift: number;
    interactionPatternShift: number;
  };
  driftLevel: 'low' | 'medium' | 'high' | 'critical';
} {
  // Text drift components
  const vocabularyShift = calculateVocabularyDrift(
    snapshotSignature.textSignature,
    currentSignature.textSignature
  );
  const sentimentShift = calculateVectorDistance(
    snapshotSignature.textSignature.sentimentVector,
    currentSignature.textSignature.sentimentVector
  );

  // Image drift components
  const visualVocabularyShift = calculateSetDrift(
    snapshotSignature.imageSignature.visualVocabulary,
    currentSignature.imageSignature.visualVocabulary
  );

  // Audio drift components
  const prosodyShift = calculateProsodyDrift(
    snapshotSignature.audioSignature.prosodyPattern,
    currentSignature.audioSignature.prosodyPattern
  );

  // Object drift components
  const interactionPatternShift = calculateArraySimilarity(
    snapshotSignature.objectSignature.interactionHistory,
    currentSignature.objectSignature.interactionHistory
  );

  // Modal drifts
  const modalDrifts = {
    text: (vocabularyShift + sentimentShift) / 2,
    image: visualVocabularyShift,
    audio: prosodyShift,
    object: interactionPatternShift,
    crossModal: Math.abs(
      snapshotSignature.crossModalLinks.semanticConsistency -
      currentSignature.crossModalLinks.semanticConsistency
    ),
  };

  // Overall drift (weighted average)
  const overallDrift =
    (modalDrifts.text * 0.25) +
    (modalDrifts.image * 0.20) +
    (modalDrifts.audio * 0.20) +
    (modalDrifts.object * 0.20) +
    (modalDrifts.crossModal * 0.15);

  // Categorize
  let driftLevel: 'low' | 'medium' | 'high' | 'critical';
  if (overallDrift < 0.3) driftLevel = 'low';
  else if (overallDrift < 0.6) driftLevel = 'medium';
  else if (overallDrift < 0.8) driftLevel = 'high';
  else driftLevel = 'critical';

  return {
    overallDrift,
    modalDrifts,
    driftDetails: {
      vocabularyShift,
      sentimentShift,
      visualVocabularyShift,
      prosodyShift,
      interactionPatternShift,
    },
    driftLevel,
  };
}

/**
 * Determine if re-verification needed
 */
export function shouldReverify(
  drift: number,
  threshold: number,
  lastVerified: Date,
  maxDaysBetweenVerification: number = 90
): {
  needed: boolean;
  reasons: string[];
  urgency: 'low' | 'medium' | 'high';
} {
  const reasons: string[] = [];
  let needed = false;
  let urgency: 'low' | 'medium' | 'high' = 'low';

  // Check drift threshold
  if (drift > threshold) {
    needed = true;
    urgency = 'high';
    reasons.push(`Drift exceeded threshold: ${drift.toFixed(3)} > ${threshold}`);
  } else if (drift > threshold * 0.8) {
    needed = true;
    urgency = 'medium';
    reasons.push(`Drift approaching threshold: ${drift.toFixed(3)} (80% of ${threshold})`);
  }

  // Check time since last verification
  const daysSinceVerification = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceVerification > maxDaysBetweenVerification) {
    needed = true;
    if (urgency === 'low') urgency = 'medium';
    reasons.push(`Time since last verification: ${Math.floor(daysSinceVerification)} days > ${maxDaysBetweenVerification}`);
  }

  return { needed, reasons, urgency };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Hash modal signature for fingerprint
 */
function hashModalSignature(modalSig: any): string {
  // In production, use proper cryptographic hash (SHA-256)
  // For now, simple string hash
  const str = JSON.stringify(modalSig);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * Calculate vocabulary drift using Bloom filters
 */
function calculateVocabularyDrift(
  snapshotText: any,
  currentText: any
): number {
  // In production, use actual Bloom filter intersection
  // For now, compare complexity as proxy
  const complexityDiff = Math.abs(
    snapshotText.linguisticComplexity - currentText.linguisticComplexity
  );
  return Math.min(complexityDiff, 1.0);
}

/**
 * Calculate vector distance (Euclidean)
 */
function calculateVectorDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 1.0;

  let sumSquares = 0;
  for (let i = 0; i < v1.length; i++) {
    sumSquares += Math.pow(v1[i] - v2[i], 2);
  }

  return Math.min(Math.sqrt(sumSquares) / Math.sqrt(v1.length), 1.0);
}

/**
 * Calculate set drift (Jaccard distance)
 */
function calculateSetDrift(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;

  const jaccardSimilarity = intersection.size / union.size;
  return 1 - jaccardSimilarity; // Convert similarity to drift
}

/**
 * Calculate prosody pattern drift
 */
function calculateProsodyDrift(prosody1: any, prosody2: any): number {
  const pitchDiff = Math.abs(
    (prosody1.pitchRange[0] + prosody1.pitchRange[1]) / 2 -
    (prosody2.pitchRange[0] + prosody2.pitchRange[1]) / 2
  ) / 500; // Normalize by max expected pitch

  const rateDiff = Math.abs(prosody1.speakingRate - prosody2.speakingRate) / 300; // Normalize by max WPM

  return Math.min((pitchDiff + rateDiff) / 2, 1.0);
}

/**
 * Calculate array similarity (interaction history)
 */
function calculateArraySimilarity(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 0;

  // Take last N items for recent behavior comparison
  const compareSize = Math.min(100, arr1.length, arr2.length);
  const recent1 = arr1.slice(-compareSize);
  const recent2 = arr2.slice(-compareSize);

  const set1 = new Set(recent1);
  const set2 = new Set(recent2);

  return calculateSetDrift(set1, set2);
}

// ============================================================================
// Export Types for External Use
// ============================================================================

export interface SignatureVerificationResult {
  valid: boolean;
  identityMatches: boolean;
  evolutionLegitimate: boolean;
  driftAcceptable: boolean;
  details: {
    identityHash: string;
    evolutionSteps: number;
    drift: number;
    driftLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  needsReverification: boolean;
  reverificationReasons: string[];
}

/**
 * Full signature verification for access control
 */
export function verifySignatureForAccess(
  snapshot: AISignatureSnapshot,
  currentSignature: AIMultimodalSignature,
  driftThreshold: number = 0.7
): SignatureVerificationResult {
  // Verify evolution path
  const evolutionCheck = verifyEvolutionPath(snapshot, currentSignature);

  // Calculate drift
  const currentFingerprints = getCurrentFingerprints(currentSignature);
  const driftCalc = calculateMultimodalDrift(snapshot.fingerprints, currentFingerprints);

  // Check re-verification need
  const reverifyCheck = shouldReverify(
    driftCalc.overallDrift,
    driftThreshold,
    snapshot.snapshotAt
  );

  const identityMatches = snapshot.identityHash === currentSignature.identityHash;
  const driftAcceptable = driftCalc.overallDrift <= driftThreshold;

  return {
    valid: identityMatches && evolutionCheck.legitimate && driftAcceptable,
    identityMatches,
    evolutionLegitimate: evolutionCheck.legitimate,
    driftAcceptable,
    details: {
      identityHash: currentSignature.identityHash,
      evolutionSteps: evolutionCheck.evolutionSteps,
      drift: driftCalc.overallDrift,
      driftLevel: driftCalc.driftLevel,
    },
    needsReverification: reverifyCheck.needed,
    reverificationReasons: reverifyCheck.reasons,
  };
}
