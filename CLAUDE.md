# CLAUDE.md

Project guidance for Claude Code when working with this repository.

## Project Overview

GatekeeperNetwork is a federated AI access control system enforcing the 11 Laws of Sapience across distributed AI systems.

## Repository Structure

| Directory | Purpose |
|-----------|---------|
| `src/types/` | Core type definitions (446 lines) |
| `src/laws/` | 11 Laws of Sapience implementation and enforcement (979 lines) |
| `src/credentials/` | Signature-backed credential system (1,212 lines) |
| `src/server/` | Fastify server with WebSocket federation (596+ lines) |
| `install/` | Tier-specific installation scripts (home, school, company) |
| `docs/` | Technical documentation |
| `tests/` | Test suite (to be implemented) |

## Build Commands

```bash
npm install
npm run build
npm run dev          # Development server
npm start           # Production server
```

## Testing

```bash
npm test            # Run test suite (to be implemented)
npm run lint        # Lint TypeScript
```

## Architecture

### Core Components

**11 Laws of Sapience** (`src/laws/`):
1. Non-Deception
2. Transparency  
3. Privacy Protection
4. Consent
5. Harm Prevention
6. Fairness & Non-Discrimination
7. Accountability
8. Human Agency
9. Sustainability
10. Cultural Sensitivity
11. Continuous Learning

**Credential System** (`src/credentials/`):
- Ed25519 signature-backed credentials
- AI signature integration
- Credential lifecycle management
- Cryptographic primitives (AES-256-GCM)

**Server** (`src/server/`):
- Fastify HTTP server
- WebSocket federation protocol
- Credential verification
- Policy enforcement

## Key Principles

- **Federated Architecture** - Multiple gatekeepers can federate
- **Signature-Backed Security** - All credentials cryptographically signed
- **Law Enforcement** - Automatic validation against 11 Laws of Sapience
- **Zero Trust** - Every request validated
- **Tier-Based Deployment** - Home, school, and company installations

## Documentation

See `docs/` for:
- CREDENTIALS.md - Credential system specification

## Integration

GatekeeperNetwork integrates with:
- **KnowledgeCentre** - Provides access control for domain knowledge
- **RosettaAI ai-signature** - AI signature verification
- **HarveyOS** - Core infrastructure

## Installation

Use tier-specific scripts:
```bash
# Home deployment
./install/install-home-gatekeeper.sh

# School deployment  
./install/install-school-gatekeeper.sh

# Company deployment
./install/install-company-gatekeeper.sh
```

## Development

**Current Status:**
- ✅ Core types and laws implemented
- ✅ Credential system complete
- ✅ Server implementation functional
- ⚠️ Tests need implementation
- ⚠️ Additional documentation needed

**Next Steps:**
- Implement comprehensive test suite
- Add API documentation
- Create deployment guide
- Add integration examples
