# GatekeeperNetwork Documentation

This directory contains technical documentation for the GatekeeperNetwork federated AI access control system.

## Core Documentation

- **CREDENTIALS.md** - Signature-backed credential system specification

## Implementation

For source code, see:
- `../src/types/` - Core type definitions
- `../src/laws/` - 11 Laws of Sapience implementation and enforcement
- `../src/credentials/` - Credential system (crypto, signatures, integration)
- `../src/server/` - Fastify server with WebSocket federation

## Installation

Tier-specific installation scripts:
- `../install/install-home-gatekeeper.sh` - Home deployment
- `../install/install-school-gatekeeper.sh` - School deployment  
- `../install/install-company-gatekeeper.sh` - Company deployment

## Related Systems

- **KnowledgeCentre** - Domain knowledge repositories that integrate with Gatekeeper
- **ai-signature** (RosettaAI) - AI signature verification system
- **HarveyOS** - Core infrastructure and coordination

## Notes

GatekeeperNetwork enforces the 11 Laws of Sapience across federated AI systems, providing signature-backed credentials, policy enforcement, and secure federation protocols.
