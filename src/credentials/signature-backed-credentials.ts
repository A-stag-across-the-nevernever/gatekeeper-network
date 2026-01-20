/**
 * Signature-Backed Credential System
 *
 * Integrates AI multimodal signatures with GatekeeperNetwork credentials
 * to create "access card" system with evolving signature recognition
 */

import {
  Credential,
  AISignatureSnapshot,
  SignatureEvolutionRecord,
  Revocation,
  GatekeeperNode,
  EducationTier,
  CompanyTier,
} from '../types/core';

/**
 * Credential with AI signature snapshot
 * Acts as a digital "access card" issued at hire/enrollment
 */
export interface SignatureBackedCredential extends Credential {
  aiSignature: AISignatureSnapshot;
  evolutionRecord: SignatureEvolutionRecord;
}

/**
 * Credential Issuance Request
 * What company Gatekeeper needs to issue an access card
 */
export interface CredentialIssuanceRequest {
  // Person
  personId: string;
  personName: string;

  // AI Signature (from ai-signature system)
  aiIdentityHash: string;
  aiPublicKey: string;
  currentEvolutionCounter: number;
  evolutionKey: string;

  // Modal fingerprints
  signatureFingerprints: {
    text: string;
    image: string;
    audio: string;
    object: string;
  };

  // Employment/Enrollment details
  role: string;
  tier: EducationTier | CompanyTier;
  capabilities?: string[];

  // Validity
  expiresAt?: Date;
}

/**
 * Access Verification Request
 * What system checks when employee tries to access resources
 */
export interface AccessVerificationRequest {
  credentialId: string;

  // Current AI signature state
  currentIdentityHash: string;
  currentEvolutionCounter: number;
  currentFingerprints: {
    text: string;
    image: string;
    audio: string;
    object: string;
  };

  // Resource being accessed
  resource: string;
  requiredCapability?: string;
}

/**
 * Access Verification Result
 */
export interface AccessVerificationResult {
  allowed: boolean;
  credential: SignatureBackedCredential;

  // Verification checks
  checks: {
    credentialValid: boolean;
    credentialActive: boolean;
    signatureMatches: boolean;
    evolutionLegitimate: boolean;
    driftAcceptable: boolean;
    capabilityGranted: boolean;
  };

  // Drift analysis
  currentDrift: number;
  driftThreshold: number;
  needsReverification: boolean;

  // Denial reasons (if any)
  denialReasons: string[];

  // Audit
  verifiedAt: Date;
  verifiedBy: string; // gatekeeperId
}

/**
 * Network Transition Request
 * When employee leaves, can request to stay on network as peer node
 */
export interface NetworkTransitionRequest {
  credentialId: string;
  personId: string;

  // Current status
  currentNodeType: 'company' | 'school' | 'university';

  // Requested transition
  requestedNodeType: 'home' | 'peer';
  reason: string;

  // Signature preservation
  preserveSignature: boolean;
  preserveNetworkHistory: boolean;
}

/**
 * Network Transition Result
 */
export interface NetworkTransitionResult {
  approved: boolean;

  // New node identity
  newGatekeeperId?: string;
  newNodeType?: 'home' | 'peer';

  // Signature status
  signaturePreserved: boolean;
  signatureStatus: 'active' | 'archived';

  // Network continuity
  networkAccessMaintained: boolean;
  peerConnections: string[]; // gatekeeperIds they can still communicate with

  // Restrictions
  restrictions?: {
    noCompanyResourceAccess: boolean;
    noKnowledgeCentreAccess: boolean;
    peerOnlyAccess: boolean;
  };
}

/**
 * Signature-Backed Credential Manager
 */
export class SignatureBackedCredentialManager {
  constructor(
    private gatekeeperId: string,
    private institutionId: string,
    private signingKey: string // Ed25519 private key
  ) {}

  /**
   * Issue a new credential with AI signature snapshot
   * Called when employee joins or student enrolls
   */
  async issueCredential(
    request: CredentialIssuanceRequest
  ): Promise<SignatureBackedCredential> {
    const credentialId = this.generateCredentialId();
    const now = new Date();

    // Create AI signature snapshot
    const snapshot: AISignatureSnapshot = {
      identityHash: request.aiIdentityHash,
      publicKey: request.aiPublicKey,
      snapshotAt: now,
      snapshotReason: 'employment',
      evolutionCounter: request.currentEvolutionCounter,
      evolutionKey: request.evolutionKey,
      fingerprints: request.signatureFingerprints,
      driftBaseline: 0, // Starting baseline
    };

    // Create evolution record
    const evolutionRecord: SignatureEvolutionRecord = {
      credentialId,
      signatureSnapshot: snapshot,
      currentEvolutionCounter: request.currentEvolutionCounter,
      currentDriftScore: 0,
      evolutionHistory: [{
        timestamp: now,
        counter: request.currentEvolutionCounter,
        driftScore: 0,
        flagged: false,
      }],
      lastVerified: now,
      needsReverification: false,
      reverificationThreshold: 0.7, // Default threshold
    };

    // Create credential
    const credential: SignatureBackedCredential = {
      credentialId,
      personId: request.personId,
      issuedBy: this.gatekeeperId,
      institutionId: this.institutionId,
      institutionType: 'employer',
      credentialType: 'employment',
      tier: request.tier,
      role: request.role,
      capabilities: request.capabilities || [],
      aiSignature: snapshot,
      issuedAt: now,
      expiresAt: request.expiresAt,
      status: 'active',
      signature: '', // Will be filled by signCredential
      signatureAlgorithm: 'Ed25519',
      evolutionRecord,
    };

    // Sign the credential
    credential.signature = await this.signCredential(credential);

    return credential;
  }

  /**
   * Verify access with evolving signature
   * Called on every resource access attempt
   */
  async verifyAccess(
    request: AccessVerificationRequest,
    credential: SignatureBackedCredential
  ): Promise<AccessVerificationResult> {
    const checks = {
      credentialValid: false,
      credentialActive: false,
      signatureMatches: false,
      evolutionLegitimate: false,
      driftAcceptable: false,
      capabilityGranted: false,
    };

    const denialReasons: string[] = [];

    // Check 1: Credential valid (signature check)
    const signatureValid = await this.verifyCredentialSignature(credential);
    checks.credentialValid = signatureValid;
    if (!signatureValid) {
      denialReasons.push('Invalid credential signature');
    }

    // Check 2: Credential active (not revoked/expired)
    checks.credentialActive = credential.status === 'active' &&
      (!credential.expiresAt || credential.expiresAt > new Date());
    if (!checks.credentialActive) {
      denialReasons.push('Credential inactive or expired');
    }

    // Check 3: AI signature matches
    checks.signatureMatches = request.currentIdentityHash === credential.aiSignature.identityHash;
    if (!checks.signatureMatches) {
      denialReasons.push('AI identity hash mismatch');
    }

    // Check 4: Evolution is legitimate (deterministic path from snapshot)
    const evolutionCheck = this.verifyEvolution(
      credential.aiSignature.evolutionCounter,
      request.currentEvolutionCounter,
      credential.aiSignature.evolutionKey
    );
    checks.evolutionLegitimate = evolutionCheck.legitimate;
    if (!checks.evolutionLegitimate) {
      denialReasons.push('Signature evolution path invalid');
    }

    // Check 5: Drift acceptable
    const driftScore = this.calculateDrift(
      credential.aiSignature.fingerprints,
      request.currentFingerprints
    );
    const driftThreshold = credential.evolutionRecord.reverificationThreshold;
    checks.driftAcceptable = driftScore <= driftThreshold;
    if (!checks.driftAcceptable) {
      denialReasons.push(`Drift too high: ${driftScore.toFixed(3)} > ${driftThreshold}`);
    }

    // Check 6: Has required capability
    checks.capabilityGranted = !request.requiredCapability ||
      (credential.capabilities?.includes(request.requiredCapability) || false);
    if (!checks.capabilityGranted) {
      denialReasons.push(`Missing capability: ${request.requiredCapability}`);
    }

    // Update evolution record
    credential.evolutionRecord.currentEvolutionCounter = request.currentEvolutionCounter;
    credential.evolutionRecord.currentDriftScore = driftScore;
    credential.evolutionRecord.evolutionHistory.push({
      timestamp: new Date(),
      counter: request.currentEvolutionCounter,
      driftScore,
      flagged: driftScore > driftThreshold,
    });

    // Determine if reverification needed
    const needsReverification = driftScore > (driftThreshold * 0.8); // 80% of threshold
    credential.evolutionRecord.needsReverification = needsReverification;

    return {
      allowed: Object.values(checks).every(v => v),
      credential,
      checks,
      currentDrift: driftScore,
      driftThreshold,
      needsReverification,
      denialReasons,
      verifiedAt: new Date(),
      verifiedBy: this.gatekeeperId,
    };
  }

  /**
   * Revoke credential with network transition option
   * Called when employee leaves company
   */
  async revokeCredential(
    credential: SignatureBackedCredential,
    reason: string,
    allowNetworkTransition: boolean = true
  ): Promise<Revocation> {
    const now = new Date();

    // Update credential status
    credential.status = 'revoked';
    credential.revokedAt = now;
    credential.revokedBy = this.gatekeeperId;
    credential.revocationReason = reason;

    // Create revocation record
    const revocation: Revocation = {
      revocationId: this.generateRevocationId(),
      credentialId: credential.credentialId,
      revokedBy: this.gatekeeperId,
      reason,
      revokedAt: now,
      effectiveAt: now,
      preserveSignature: true, // Always preserve for audit/recognition
      signatureStatus: allowNetworkTransition ? 'active' : 'archived',
      distributedTo: [], // Will be filled by distribution system
    };

    // If network transition allowed, set transition option
    if (allowNetworkTransition) {
      revocation.transitionToNodeType = 'peer';
      revocation.transitionApproved = false; // Requires explicit approval
    }

    return revocation;
  }

  /**
   * Process network transition request
   * Allow ex-employee to stay on network as peer node
   */
  async processNetworkTransition(
    request: NetworkTransitionRequest,
    revocation: Revocation
  ): Promise<NetworkTransitionResult> {
    // Check if transition is allowed
    if (!revocation.transitionToNodeType) {
      return {
        approved: false,
        signaturePreserved: revocation.preserveSignature,
        signatureStatus: revocation.signatureStatus,
        networkAccessMaintained: false,
        peerConnections: [],
      };
    }

    // Approve transition
    const newGatekeeperId = this.generateGatekeeperId(request.personId, request.requestedNodeType);

    revocation.transitionApproved = true;
    revocation.transitionedAt = new Date();

    // Determine peer connections (can stay connected to colleagues who also transitioned)
    const peerConnections = await this.findPeerConnections(request.personId);

    return {
      approved: true,
      newGatekeeperId,
      newNodeType: request.requestedNodeType,
      signaturePreserved: request.preserveSignature,
      signatureStatus: 'active', // Keep active for peer network
      networkAccessMaintained: true,
      peerConnections,
      restrictions: {
        noCompanyResourceAccess: true, // Can't access company KC anymore
        noKnowledgeCentreAccess: true, // Can't access company KC
        peerOnlyAccess: true,          // Can only communicate with peers
      },
    };
  }

  /**
   * Sign credential with institution's private key
   */
  private async signCredential(credential: Credential): Promise<string> {
    // In real implementation, use Ed25519 signing
    // For now, simulate with hash
    const data = `${credential.credentialId}:${credential.personId}:${credential.aiSignature.identityHash}`;
    return `sig_${Buffer.from(data).toString('base64')}`;
  }

  /**
   * Verify credential signature
   */
  private async verifyCredentialSignature(credential: Credential): Promise<boolean> {
    // In real implementation, verify Ed25519 signature
    // For now, check signature exists
    return credential.signature.startsWith('sig_');
  }

  /**
   * Verify evolution path is deterministic
   */
  private verifyEvolution(
    snapshotCounter: number,
    currentCounter: number,
    evolutionKey: string
  ): { legitimate: boolean; expectedCounter: number } {
    // In real implementation, use deterministic evolution from ai-signature system
    // For now, check counter only increased (no backwards evolution)
    return {
      legitimate: currentCounter >= snapshotCounter,
      expectedCounter: currentCounter,
    };
  }

  /**
   * Calculate drift between snapshot and current fingerprints
   */
  private calculateDrift(
    snapshotFingerprints: { text: string; image: string; audio: string; object: string },
    currentFingerprints: { text: string; image: string; audio: string; object: string }
  ): number {
    // In real implementation, use multimodal drift calculation from ai-signature system
    // For now, simulate with simple hash comparison
    const modalities = ['text', 'image', 'audio', 'object'];
    let matchCount = 0;

    for (const modality of modalities) {
      if (snapshotFingerprints[modality] === currentFingerprints[modality]) {
        matchCount++;
      }
    }

    // Drift = 1 - (match ratio)
    return 1 - (matchCount / modalities.length);
  }

  /**
   * Find peer connections for ex-employee
   */
  private async findPeerConnections(personId: string): Promise<string[]> {
    // In real implementation, query network for other ex-employees who transitioned
    // For now, return empty array
    return [];
  }

  // ID generation helpers
  private generateCredentialId(): string {
    return `cred_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateRevocationId(): string {
    return `rev_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateGatekeeperId(personId: string, nodeType: string): string {
    return `gk_${nodeType}_${personId}_${Date.now()}`;
  }
}

/**
 * Workflow Examples
 */

// Example 1: Employee joins company
export async function exampleEmployeeOnboarding(
  manager: SignatureBackedCredentialManager,
  aiSignature: any // From ai-signature system
) {
  const request: CredentialIssuanceRequest = {
    personId: 'person_123',
    personName: 'John Smith',
    aiIdentityHash: aiSignature.identityHash,
    aiPublicKey: Buffer.from(aiSignature.crypto.publicKey).toString('base64'),
    currentEvolutionCounter: aiSignature.evolutionState.counter,
    evolutionKey: aiSignature.evolutionState.evolutionKey,
    signatureFingerprints: {
      text: 'hash_of_text_signature',
      image: 'hash_of_image_signature',
      audio: 'hash_of_audio_signature',
      object: 'hash_of_object_signature',
    },
    role: 'Software Engineer',
    tier: CompanyTier.SMALL_BUSINESS,
    capabilities: ['code_write', 'repo_read', 'slack_access'],
  };

  const credential = await manager.issueCredential(request);
  console.log('✓ Credential issued:', credential.credentialId);
  console.log('✓ Signature snapshot taken at evolution counter:', credential.aiSignature.evolutionCounter);
}

// Example 2: Employee accesses resource (daily)
export async function exampleAccessVerification(
  manager: SignatureBackedCredentialManager,
  credential: SignatureBackedCredential,
  currentAISignature: any
) {
  const request: AccessVerificationRequest = {
    credentialId: credential.credentialId,
    currentIdentityHash: currentAISignature.identityHash,
    currentEvolutionCounter: currentAISignature.evolutionState.counter,
    currentFingerprints: {
      text: 'current_text_hash',
      image: 'current_image_hash',
      audio: 'current_audio_hash',
      object: 'current_object_hash',
    },
    resource: 'company_knowledge_centre',
    requiredCapability: 'repo_read',
  };

  const result = await manager.verifyAccess(request, credential);

  if (result.allowed) {
    console.log('✓ Access granted');
    console.log('  Current drift:', result.currentDrift.toFixed(3));
    console.log('  Evolution counter:', request.currentEvolutionCounter);
  } else {
    console.log('✗ Access denied');
    console.log('  Reasons:', result.denialReasons.join(', '));
  }

  if (result.needsReverification) {
    console.log('⚠ Signature approaching drift threshold, recommend re-verification');
  }
}

// Example 3: Employee leaves, transitions to peer network
export async function exampleEmployeeDeparture(
  manager: SignatureBackedCredentialManager,
  credential: SignatureBackedCredential
) {
  // Step 1: Revoke employment credential
  const revocation = await manager.revokeCredential(
    credential,
    'Employee resigned',
    true // Allow network transition
  );

  console.log('✓ Credential revoked:', revocation.revocationId);
  console.log('  Signature preserved:', revocation.preserveSignature);
  console.log('  Network transition available:', revocation.transitionToNodeType);

  // Step 2: Employee requests to stay on network as peer
  const transitionRequest: NetworkTransitionRequest = {
    credentialId: credential.credentialId,
    personId: credential.personId,
    currentNodeType: 'company',
    requestedNodeType: 'peer',
    reason: 'Want to stay connected with colleagues',
    preserveSignature: true,
    preserveNetworkHistory: true,
  };

  const transitionResult = await manager.processNetworkTransition(
    transitionRequest,
    revocation
  );

  if (transitionResult.approved) {
    console.log('✓ Network transition approved');
    console.log('  New gatekeeper ID:', transitionResult.newGatekeeperId);
    console.log('  New node type:', transitionResult.newNodeType);
    console.log('  Signature status:', transitionResult.signatureStatus);
    console.log('  Can communicate with:', transitionResult.peerConnections.length, 'peers');
    console.log('  Restrictions:', transitionResult.restrictions);
  }
}
