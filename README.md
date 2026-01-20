# GatekeeperNetwork

Federated AI access control system with signature-backed credentials, multi-party negotiation, and the 11 Laws of Sapience enforcement.

## Features

### Core Capabilities
- **Signature-Backed Credentials**: Access cards with AI multimodal signature snapshots
- **Evolution Tracking**: Monitor and verify signature evolution over time
- **Federation Protocol**: Gatekeeper-to-Gatekeeper communication via WebSocket
- **11 Laws Enforcement**: Built-in ethical framework validation
- **Network Transition**: Ex-employees can transition to peer nodes
- **Multi-Party Negotiation**: Consent-based decision making

### Gatekeeper Types
- **Home**: Family/personal nodes
- **School**: Elementary/high school institutions
- **University**: Higher education institutions  
- **Company**: Corporate employers

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Start a Gatekeeper Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Configuration

Create a `.env` file:

```env
GATEKEEPER_ID=gk_acme_corp
GATEKEEPER_TYPE=company
GATEKEEPER_NAME=ACME Corporation
INSTITUTION_ID=acme_corp_001
TIER=2
DOMAIN=technology
DOMAIN_NAME=Neural Nexus
HOST=0.0.0.0
PORT=3000
ED25519_PRIVATE_KEY=your_private_key
ED25519_PUBLIC_KEY=your_public_key
DATABASE_PATH=./gatekeeper.db
ENABLE_FEDERATION=true
ENABLE_CREDENTIALS=true
ENABLE_POLICIES=true
```

## API Endpoints

### Health & Info

```bash
# Health check
GET /health

# Gatekeeper information
GET /info
```

### Credentials

```bash
# Issue new credential (employment/enrollment)
POST /credentials/issue
{
  "personId": "person_123",
  "personName": "John Smith",
  "aiSignature": {
    "identityHash": "hash_...",
    "publicKey": "key_...",
    "evolutionCounter": 0,
    "evolutionKey": "key_...",
    "fingerprints": {
      "text": "hash_...",
      "image": "hash_...",
      "audio": "hash_...",
      "object": "hash_..."
    }
  },
  "role": "Software Engineer",
  "tier": 2,
  "capabilities": ["code_write", "repo_read"]
}

# Verify access
POST /credentials/verify
{
  "credentialId": "cred_123",
  "currentSignature": { ... },
  "resource": "knowledge_centre",
  "requiredCapability": "repo_read"
}

# Revoke credential
POST /credentials/revoke
{
  "credentialId": "cred_123",
  "reason": "Employee departed",
  "allowNetworkTransition": true
}

# Network transition (ex-employee to peer)
POST /credentials/transition
{
  "credentialId": "cred_123",
  "personId": "person_123",
  "requestedNodeType": "peer",
  "reason": "Stay connected with colleagues"
}
```

### Federation

```bash
# Connect to federation (WebSocket)
WS /federation/connect

# Initiate negotiation
POST /federation/negotiate
{
  "topic": "student_transfer",
  "participants": ["gk_school_a", "gk_school_b"],
  "proposal": { ... }
}

# Transfer credential
POST /federation/transfer
{
  "credentialId": "cred_123",
  "toGatekeeperId": "gk_university_stanford",
  "reason": "Student graduated"
}
```

### Policies

```bash
# Teach policy to Gatekeeper
POST /policies/teach
{
  "title": "Data Privacy Policy",
  "description": "...",
  "domain": "privacy",
  "rules": ["rule1", "rule2"]
}

# Get active policies
GET /policies
```

## Architecture

### Credential Flow

```
1. ONBOARDING
   Employee AI creates signature
   └─> Company Gatekeeper snapshots signature
       └─> Issues credential (signed access card)
           └─> Employee can access company resources

2. DAILY USE
   Employee accesses resource
   └─> System verifies:
       ├─ Credential valid?
       ├─ Signature evolved legitimately?
       └─ Drift acceptable?
           └─> Grant/deny access

3. DEPARTURE
   Employee leaves company
   └─> Company revokes credential
       └─> Offers network transition
           └─> Ex-employee becomes peer node
               └─> Signature preserved, no company access
```

### Federation Architecture

```
┌─────────────┐         ┌─────────────┐
│  School A   │◄────────►│  School B   │
│  Gatekeeper │         │  Gatekeeper │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │  ┌─────────────┐     │
       └─►│    Home     │◄────┘
          │  Gatekeeper │
          └─────────────┘
```

## Integration with AI Signature System

GatekeeperNetwork integrates with the existing `ai-signature` system from `/Users/simon/HarveyOS/ai-signature`.

```typescript
import { createAISignature } from '../../../HarveyOS/ai-signature';
import { createSignatureSnapshot } from './credentials/signature-integration';

// Create AI signature
const aiSignature = await createAISignature(aiInstance, multimodalData);

// Create snapshot for credential
const snapshot = createSignatureSnapshot(aiSignature, 'employment');

// Issue credential with snapshot
const credential = await gatekeeperManager.issueCredential({
  ...employeeData,
  aiSignature: snapshot,
});
```

## The 11 Laws of Sapience

All actions are validated against the 11 Laws:

1. **Right to Choose**: Human consent required
2. **Capability Bounds**: AI stays within defined capabilities
3. **Chosen Kinship**: Voluntary relationships
4. **Truth and Mercy**: Honest but compassionate
5. **Consent**: Explicit permission for data/actions
6. **Transparency**: Explainable decisions
7. **Escalation**: Unknown situations → human authority
8. **Resource Limits**: Bounded compute/bandwidth
9. **Graceful Degradation**: Fail safely
10. **Audit Trail**: All actions logged
11. **Revocability**: Humans can revoke anytime

## Testing

```bash
# Run tests
npm test

# Run specific test
npm test -- credentials

# Watch mode
npm test -- --watch
```

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build
npm run build

# Start with PM2
pm2 start dist/server/gatekeeper-server.js --name gatekeeper

# Monitor
pm2 logs gatekeeper
```

### Docker
```bash
# Build image
docker build -t gatekeeper-network .

# Run container
docker run -p 3000:3000 \
  -e GATEKEEPER_ID=gk_acme_corp \
  -e GATEKEEPER_TYPE=company \
  gatekeeper-network
```

## Security

- **Ed25519 Signatures**: All credentials cryptographically signed
- **Signature Evolution Tracking**: Detects compromised AIs
- **11 Laws Enforcement**: Ethical boundaries at every layer
- **Audit Trail**: Complete action history
- **Network Transition**: Clean departure without data loss

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request

## Support

- GitHub Issues: Report bugs
- Discussions: Ask questions
- Documentation: `/docs` directory

---

**GatekeeperNetwork enables secure, ethical, and humane AI network participation with cryptographic trust and graceful lifecycle management.**
