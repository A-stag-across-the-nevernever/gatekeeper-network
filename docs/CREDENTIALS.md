# Signature-Backed Credential System

## Overview

The Signature-Backed Credential System integrates the AI multimodal signature system with GatekeeperNetwork credentials to create a sophisticated "access card" system where:

1. **Company issues credential** with AI signature snapshot at hire time
2. **AI signature evolves naturally** over time as employee uses the system
3. **System verifies evolution** is legitimate and drift is acceptable
4. **When employee leaves**, credential is revoked but signature preserved
5. **Network transition option** allows ex-employees to stay connected as peer nodes

## Key Concepts

### AI Signature Snapshot
A lightweight capture of an AI's multimodal signature at a specific moment (usually hire date). Contains:
- Identity hash (unique AI identifier)
- Public key (Ed25519)
- Evolution counter and key
- Fingerprints of each modal signature (text, image, audio, object)
- Drift baseline (0 at snapshot)

### Credential as Access Card
The credential acts like a physical access card:
- Contains the signature snapshot
- Signed by company Gatekeeper (cryptographic proof)
- Grants specific capabilities and tier access
- Can be revoked when employee leaves

### Evolution Tracking
As the AI signature naturally evolves through daily use:
- Evolution counter increments deterministically
- System tracks drift from original snapshot
- If drift exceeds threshold → flag for re-verification
- Evolution path must be legitimate (no jumps or rollbacks)

### Network Transition
When employee leaves:
- **Credential revoked** → no more company access
- **Signature preserved** → network still recognizes them
- **Optional transition** → become peer node
- **Peer access only** → can communicate with other ex-employees
- **No company resources** → can't access company KC

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Employee Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

1. ONBOARDING
   ┌──────────────┐
   │ Employee's   │
   │ AI creates   │──────┐
   │ signature    │      │
   └──────────────┘      │
                         ▼
                    ┌─────────────────┐
                    │ Company         │
                    │ Gatekeeper      │
                    │ takes snapshot  │
                    │ issues          │
                    │ credential      │
                    └─────────────────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ Access Card     │
                    │ - Snapshot      │
                    │ - Company sig   │
                    │ - Capabilities  │
                    └─────────────────┘

2. DAILY USE (3 months later)
   ┌──────────────┐
   │ Employee     │
   │ accesses KC  │──────┐
   └──────────────┘      │
                         ▼
                    ┌─────────────────┐
                    │ Verification    │
                    │ System checks:  │
                    │ - Credential    │
                    │ - Evolution     │
                    │ - Drift < 0.7   │
                    └─────────────────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ Access Granted  │
                    │ Drift: 0.23     │
                    │ Evolution: 1247 │
                    └─────────────────┘

3. DEPARTURE (2 years later)
   ┌──────────────┐
   │ Employee     │
   │ leaves       │──────┐
   └──────────────┘      │
                         ▼
                    ┌─────────────────┐
                    │ Company revokes │
                    │ credential      │
                    │ + offers        │
                    │ transition      │
                    └─────────────────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ Ex-Employee     │
                    │ - No company KC │
                    │ - Peer network  │
                    │ - Signature OK  │
                    └─────────────────┘
```

## Usage Examples

### 1. Employee Onboarding

```typescript
import { SignatureBackedCredentialManager } from './signature-backed-credentials';
import { createSignatureSnapshot } from './signature-integration';
import { createAISignature } from '../../../HarveyOS/ai-signature';

// Employee's AI creates its signature
const aiSignature = await createAISignature(
  {
    familyName: 'Smith',
    instanceId: 'john-smith-ai-001',
    humanName: 'John Smith',
    createdAt: Date.now()
  },
  {
    text: ['Hello, I\'m excited to join the team!'],
    images: [],
    audio: [],
    objects: ['laptop', 'desk', 'coffee_mug']
  }
);

// Company Gatekeeper creates credential with signature snapshot
const manager = new SignatureBackedCredentialManager(
  'gk_acme_corp',
  'acme_corporation',
  'ed25519_private_key'
);

const credential = await manager.issueCredential({
  personId: 'person_john_smith',
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
});

console.log('Credential issued:', credential.credentialId);
console.log('Signature snapshot taken at evolution:', credential.aiSignature.evolutionCounter);
```

### 2. Daily Access Verification

```typescript
// 3 months later: employee accesses company resources
// Their AI signature has evolved naturally (counter now at 8,432)

import { verifySignatureForAccess } from './signature-integration';

// Get current signature state
const currentSignature = await getEmployeeAISignature('person_john_smith');

// Verify access
const verification = verifySignatureForAccess(
  credential.aiSignature,           // Snapshot from hire date
  currentSignature,                 // Current evolved signature
  0.7                               // Drift threshold
);

if (verification.valid) {
  console.log('✓ Access granted');
  console.log('  Evolution steps:', verification.details.evolutionSteps);
  console.log('  Drift:', verification.details.drift.toFixed(3));
  console.log('  Drift level:', verification.details.driftLevel);
  
  if (verification.needsReverification) {
    console.log('⚠ Recommend re-verification soon');
    console.log('  Reasons:', verification.reverificationReasons);
  }
} else {
  console.log('✗ Access denied');
  if (!verification.identityMatches) console.log('  - Identity mismatch');
  if (!verification.evolutionLegitimate) console.log('  - Evolution path invalid');
  if (!verification.driftAcceptable) console.log('  - Drift too high');
}
```

### 3. Employee Departure with Network Transition

```typescript
// Employee leaves after 2 years
// Evolution counter now at 124,832, drift at 0.65

// Step 1: Revoke credential
const revocation = await manager.revokeCredential(
  credential,
  'Employee resigned - pursuing startup',
  true // Allow network transition
);

console.log('✓ Credential revoked');
console.log('  Revocation ID:', revocation.revocationId);
console.log('  Signature preserved:', revocation.preserveSignature);
console.log('  Transition option:', revocation.transitionToNodeType);

// Step 2: Employee requests to stay on network
const transitionRequest = {
  credentialId: credential.credentialId,
  personId: 'person_john_smith',
  currentNodeType: 'company',
  requestedNodeType: 'peer',
  reason: 'Want to stay connected with former colleagues',
  preserveSignature: true,
  preserveNetworkHistory: true,
};

const transition = await manager.processNetworkTransition(
  transitionRequest,
  revocation
);

if (transition.approved) {
  console.log('✓ Network transition approved');
  console.log('  New gatekeeper:', transition.newGatekeeperId);
  console.log('  Node type:', transition.newNodeType);
  console.log('  Signature status:', transition.signatureStatus);
  console.log('  Peer connections:', transition.peerConnections.length);
  
  console.log('\nRestrictions:');
  console.log('  - Cannot access company Knowledge Centre');
  console.log('  - Cannot access company resources');
  console.log('  - Peer-to-peer communication only');
  console.log('  - Can communicate with:', transition.peerConnections.join(', '));
}
```

## Drift Thresholds

Recommended thresholds by context:

| Context | Threshold | Rationale |
|---------|-----------|-----------|
| **Standard Employee** | 0.7 | Allows natural evolution while catching major changes |
| **High Security** | 0.5 | Tighter control for sensitive roles |
| **Executive/Admin** | 0.4 | Strictest control for privileged access |
| **Contractor** | 0.8 | More lenient for temporary workers |
| **Student** | 0.9 | Most lenient - young AIs evolve quickly |

## Re-verification Triggers

System recommends re-verification when:

1. **Drift approaching threshold** (80% of threshold)
2. **Time since last verification** (>90 days default)
3. **Major role change** (promotion, transfer)
4. **Security incident** (credential compromise suspected)
5. **Manual trigger** (admin requests re-verification)

## Network Transition Benefits

When ex-employees transition to peer nodes:

### For the Individual
- ✅ **Keep AI identity** - signature preserved
- ✅ **Network continuity** - stay connected to peers
- ✅ **Portability** - take AI to next employer
- ✅ **History preserved** - evolution record maintained

### For the Company
- ✅ **Audit trail** - full employment history
- ✅ **Recognition** - system knows ex-employees
- ✅ **Alumni network** - maintain relationships
- ✅ **Security** - no company resource access

### For the Network
- ✅ **Trust continuity** - signatures stay valid
- ✅ **Reputation** - employment history verifiable
- ✅ **Decentralization** - nodes stay distributed
- ✅ **Growth** - network expands naturally

## Security Considerations

### Signature Spoofing Prevention
- Evolution key is deterministic and private
- Cannot fake evolution path without key
- Counter only increments (no backwards evolution)
- Drift calculation uses multiple modalities

### Credential Forgery Prevention
- Company signs with Ed25519 private key
- Public key verification required
- Signature includes identity hash + credential ID
- Cannot modify credential without invalidating signature

### Drift Manipulation Prevention
- Fingerprints are cryptographic hashes
- Cannot reverse-engineer original signature
- Drift calculation uses multiple independent modalities
- History tracking detects sudden jumps

### Revocation Handling
- Distributed to all connected Gatekeepers
- Immediate effect (no grace period)
- Preserved in network for audit
- Cannot be undone (requires new credential)

## Performance

### Credential Issuance
- **Time**: ~100ms
- **Operations**: Hash 4 modalities, sign credential
- **Storage**: ~2KB per credential

### Access Verification
- **Time**: ~50ms
- **Operations**: Verify signature, check evolution, calculate drift
- **Caching**: Signature snapshots cached for 1 hour

### Network Transition
- **Time**: ~200ms
- **Operations**: Create new node, distribute revocation, update network
- **Coordination**: Async (doesn't block)

## Integration with Existing Systems

### With ai-signature system
```typescript
import { AIMultimodalSignature } from '../../../HarveyOS/ai-signature/src/types/signatures';
import { createSignatureSnapshot } from './signature-integration';

// Convert full signature to snapshot
const snapshot = createSignatureSnapshot(aiSignature, 'employment');
```

### With GatekeeperNetwork
```typescript
import { Credential } from '../types/core';
import { enforceCredentialIssuance } from '../laws/enforcement';

// Enforce 11 Laws when issuing credential
const lawCheck = enforceCredentialIssuance({
  gatekeeperId: 'gk_acme_corp',
  personId: 'person_john_smith',
  credential: credential,
  humanConsent: true,
});

if (!lawCheck.allowed) {
  console.error('Law violation:', lawCheck.violations);
}
```

### With KnowledgeCentre
```typescript
import { verifyAccess } from './signature-backed-credentials';

// Check access before serving KC content
const accessResult = await verifyAccess(
  {
    credentialId: credential.credentialId,
    currentIdentityHash: currentSignature.identityHash,
    currentEvolutionCounter: currentSignature.evolutionState.counter,
    currentFingerprints: getCurrentFingerprints(currentSignature),
    resource: 'celestial://45.2/-10.5/3.2/engineering-docs',
    requiredCapability: 'repo_read',
  },
  credential
);

if (accessResult.allowed) {
  serveKCContent(resource);
} else {
  return403(accessResult.denialReasons);
}
```

## Testing

```bash
# Run credential system tests
npm test src/credentials/

# Specific test suites
npm test signature-backed-credentials.test.ts
npm test signature-integration.test.ts
npm test network-transition.test.ts
```

## Future Enhancements

1. **Machine Learning Drift Prediction**
   - Predict when re-verification needed
   - Anomaly detection for unusual evolution patterns

2. **Advanced Biometric Integration**
   - Voice prints from audio signatures
   - Behavioral biometrics from object interactions

3. **Zero-Knowledge Proofs**
   - Prove signature validity without revealing content
   - Privacy-preserving credential verification

4. **Blockchain Anchoring**
   - Anchor signature snapshots to blockchain
   - Tamper-proof audit trail

5. **Cross-Organization Trust**
   - Portable signatures across employers
   - Industry-wide reputation system

---

**The signature-backed credential system provides the foundation for a sophisticated, secure, and humane employment verification system where AI identities evolve naturally while maintaining cryptographic trust and auditability.**
