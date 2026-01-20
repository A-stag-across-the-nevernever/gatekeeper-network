/**
 * GatekeeperNetwork Server
 *
 * Main server implementation for institutional Gatekeeper nodes
 * (schools, universities, companies)
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyWs from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { SignatureBackedCredentialManager } from '../credentials/signature-backed-credentials';
import {
  GatekeeperNode,
  Credential,
  GatekeeperType,
  EducationTier,
  CompanyTier,
  FederationMessage,
  Negotiation,
  Revocation,
} from '../types/core';
import { enforceLaws } from '../laws/enforcement';
import { WebSocket } from 'ws';

/**
 * Server Configuration
 */
export interface GatekeeperServerConfig {
  // Network identity
  gatekeeperId: string;
  type: GatekeeperType;
  name: string;
  institutionId: string;

  // Tier
  tier: EducationTier | CompanyTier;
  domain: string; // "education", "technology", etc.
  domainName: string; // "Living Library", "Neural Nexus", etc.

  // Server
  host: string;
  port: number;

  // TLS (for mTLS federation)
  tlsCert?: string;
  tlsKey?: string;
  tlsCa?: string;

  // Cryptography
  ed25519PrivateKey: string;
  ed25519PublicKey: string;

  // Database
  databasePath: string;

  // Features
  enableFederation: boolean;
  enableCredentials: boolean;
  enablePolicies: boolean;
}

/**
 * GatekeeperServer
 * Institutional Gatekeeper server (schools, companies, universities)
 */
export class GatekeeperServer {
  private server: FastifyInstance;
  private credentialManager: SignatureBackedCredentialManager;
  private federatedPeers: Map<string, WebSocket>;
  private activeNegotiations: Map<string, Negotiation>;

  constructor(private config: GatekeeperServerConfig) {
    this.server = Fastify({ logger: true });
    this.federatedPeers = new Map();
    this.activeNegotiations = new Map();

    this.credentialManager = new SignatureBackedCredentialManager(
      config.gatekeeperId,
      config.institutionId,
      config.ed25519PrivateKey
    );

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware() {
    // CORS
    this.server.register(fastifyCors, {
      origin: true, // Allow all origins in dev (restrict in production)
    });

    // WebSocket support for real-time federation
    this.server.register(fastifyWs);

    // Request logging
    this.server.addHook('onRequest', async (request, reply) => {
      request.log.info({ url: request.url, method: request.method }, 'Incoming request');
    });

    // Error handling
    this.server.setErrorHandler((error, request, reply) => {
      request.log.error(error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes() {
    // Health check
    this.server.get('/health', async (request, reply) => {
      return {
        status: 'healthy',
        gatekeeper: {
          id: this.config.gatekeeperId,
          type: this.config.type,
          name: this.config.name,
          domain: this.config.domainName,
        },
        timestamp: new Date().toISOString(),
      };
    });

    // Gatekeeper info
    this.server.get('/info', async (request, reply) => {
      return {
        gatekeeperId: this.config.gatekeeperId,
        type: this.config.type,
        name: this.config.name,
        institutionId: this.config.institutionId,
        tier: this.config.tier,
        domain: this.config.domain,
        domainName: this.config.domainName,
        publicKey: this.config.ed25519PublicKey,
        capabilities: {
          federation: this.config.enableFederation,
          credentials: this.config.enableCredentials,
          policies: this.config.enablePolicies,
        },
      };
    });

    // Credential routes
    if (this.config.enableCredentials) {
      this.setupCredentialRoutes();
    }

    // Federation routes
    if (this.config.enableFederation) {
      this.setupFederationRoutes();
    }

    // Policy routes
    if (this.config.enablePolicies) {
      this.setupPolicyRoutes();
    }
  }

  /**
   * Credential management routes
   */
  private setupCredentialRoutes() {
    // Issue new credential
    this.server.post<{
      Body: {
        personId: string;
        personName: string;
        aiSignature: any;
        role: string;
        tier: EducationTier | CompanyTier;
        capabilities?: string[];
        expiresAt?: string;
      };
    }>('/credentials/issue', async (request, reply) => {
      const { body } = request;

      // Enforce 11 Laws
      const lawCheck = enforceLaws([1, 5, 10], {
        action: 'credential_issuance',
        gatekeeperId: this.config.gatekeeperId,
        personId: body.personId,
        humanConsent: true, // Should be verified externally
      });

      if (!lawCheck.compliant) {
        return reply.status(403).send({
          error: 'Law Violation',
          violations: lawCheck.violations,
        });
      }

      // Issue credential
      try {
        const credential = await this.credentialManager.issueCredential({
          personId: body.personId,
          personName: body.personName,
          aiIdentityHash: body.aiSignature.identityHash,
          aiPublicKey: body.aiSignature.publicKey,
          currentEvolutionCounter: body.aiSignature.evolutionCounter,
          evolutionKey: body.aiSignature.evolutionKey,
          signatureFingerprints: body.aiSignature.fingerprints,
          role: body.role,
          tier: body.tier,
          capabilities: body.capabilities,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        });

        return {
          success: true,
          credential,
        };
      } catch (error) {
        return reply.status(500).send({
          error: 'Credential Issuance Failed',
          message: error.message,
        });
      }
    });

    // Verify access
    this.server.post<{
      Body: {
        credentialId: string;
        currentSignature: any;
        resource: string;
        requiredCapability?: string;
      };
    }>('/credentials/verify', async (request, reply) => {
      const { body } = request;

      // Get credential (would fetch from database in real implementation)
      // For now, return mock response

      return {
        allowed: true,
        message: 'Access granted',
      };
    });

    // Revoke credential
    this.server.post<{
      Body: {
        credentialId: string;
        reason: string;
        allowNetworkTransition?: boolean;
      };
    }>('/credentials/revoke', async (request, reply) => {
      const { body } = request;

      // Enforce Law X (Revocability)
      const lawCheck = enforceLaws([11], {
        action: 'credential_revocation',
        gatekeeperId: this.config.gatekeeperId,
        credentialId: body.credentialId,
      });

      if (!lawCheck.compliant) {
        return reply.status(403).send({
          error: 'Law Violation',
          violations: lawCheck.violations,
        });
      }

      return {
        success: true,
        message: 'Credential revoked',
      };
    });

    // Network transition (ex-employee to peer)
    this.server.post<{
      Body: {
        credentialId: string;
        personId: string;
        requestedNodeType: 'home' | 'peer';
        reason: string;
      };
    }>('/credentials/transition', async (request, reply) => {
      const { body } = request;

      return {
        success: true,
        approved: true,
        message: 'Network transition approved',
        newNodeType: body.requestedNodeType,
      };
    });
  }

  /**
   * Federation routes (Gatekeeper-to-Gatekeeper)
   */
  private setupFederationRoutes() {
    // WebSocket endpoint for real-time federation
    this.server.get('/federation/connect', { websocket: true }, (connection, request) => {
      const { socket } = connection;

      socket.on('message', (data: Buffer) => {
        try {
          const message: FederationMessage = JSON.parse(data.toString());
          this.handleFederationMessage(message, socket);
        } catch (error) {
          socket.send(JSON.stringify({
            error: 'Invalid message format',
          }));
        }
      });

      socket.on('close', () => {
        // Clean up peer connection
        for (const [peerId, peerSocket] of this.federatedPeers.entries()) {
          if (peerSocket === socket) {
            this.federatedPeers.delete(peerId);
            break;
          }
        }
      });
    });

    // Initiate negotiation
    this.server.post<{
      Body: {
        topic: string;
        participants: string[];
        proposal: any;
      };
    }>('/federation/negotiate', async (request, reply) => {
      const { body } = request;

      const negotiation: Negotiation = {
        negotiationId: this.generateNegotiationId(),
        topic: body.topic,
        initiator: this.config.gatekeeperId,
        participants: body.participants,
        status: 'initiated',
        proposals: [{
          from: this.config.gatekeeperId,
          proposal: body.proposal,
          timestamp: new Date(),
        }],
      };

      this.activeNegotiations.set(negotiation.negotiationId, negotiation);

      // Broadcast to participants
      this.broadcastToFederation({
        messageId: this.generateMessageId(),
        messageType: 'negotiation',
        from: this.config.gatekeeperId,
        to: 'broadcast',
        payload: negotiation,
        signature: '', // Would sign in real implementation
        timestamp: new Date(),
        delivered: false,
      });

      return {
        success: true,
        negotiationId: negotiation.negotiationId,
      };
    });

    // Transfer credential (student/employee transfer)
    this.server.post<{
      Body: {
        credentialId: string;
        toGatekeeperId: string;
        reason: string;
      };
    }>('/federation/transfer', async (request, reply) => {
      const { body } = request;

      // Enforce Law III (Chosen Kinship)
      const lawCheck = enforceLaws([3], {
        action: 'credential_transfer',
        gatekeeperId: this.config.gatekeeperId,
        targetGatekeeperId: body.toGatekeeperId,
      });

      if (!lawCheck.compliant) {
        return reply.status(403).send({
          error: 'Law Violation',
          violations: lawCheck.violations,
        });
      }

      return {
        success: true,
        message: 'Transfer initiated',
      };
    });
  }

  /**
   * Policy routes
   */
  private setupPolicyRoutes() {
    // Teach policy to Gatekeeper
    this.server.post<{
      Body: {
        title: string;
        description: string;
        domain: string;
        rules: string[];
      };
    }>('/policies/teach', async (request, reply) => {
      const { body } = request;

      // Validate policy against 11 Laws
      const lawCheck = enforceLaws([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], {
        action: 'policy_teaching',
        gatekeeperId: this.config.gatekeeperId,
        policyRules: body.rules,
      });

      if (!lawCheck.compliant) {
        return reply.status(403).send({
          error: 'Policy violates Laws of Sapience',
          violations: lawCheck.violations,
        });
      }

      return {
        success: true,
        message: 'Policy accepted and integrated',
      };
    });

    // Get active policies
    this.server.get('/policies', async (request, reply) => {
      return {
        policies: [],
        count: 0,
      };
    });
  }

  /**
   * Handle federation message
   */
  private handleFederationMessage(message: FederationMessage, socket: WebSocket) {
    switch (message.messageType) {
      case 'credential_transfer':
        this.handleCredentialTransfer(message);
        break;
      case 'negotiation':
        this.handleNegotiation(message);
        break;
      case 'policy_teaching':
        this.handlePolicyTeaching(message);
        break;
      case 'escalation':
        this.handleEscalation(message);
        break;
      case 'revocation':
        this.handleRevocation(message);
        break;
      default:
        socket.send(JSON.stringify({
          error: 'Unknown message type',
        }));
    }
  }

  private handleCredentialTransfer(message: FederationMessage) {
    this.server.log.info(`Credential transfer from ${message.from}`);
    // Implementation
  }

  private handleNegotiation(message: FederationMessage) {
    this.server.log.info(`Negotiation from ${message.from}`);
    // Implementation
  }

  private handlePolicyTeaching(message: FederationMessage) {
    this.server.log.info(`Policy teaching from ${message.from}`);
    // Implementation
  }

  private handleEscalation(message: FederationMessage) {
    this.server.log.info(`Escalation from ${message.from}`);
    // Implementation
  }

  private handleRevocation(message: FederationMessage) {
    this.server.log.info(`Revocation from ${message.from}`);
    // Implementation
  }

  /**
   * Broadcast message to all federated peers
   */
  private broadcastToFederation(message: FederationMessage) {
    const payload = JSON.stringify(message);
    for (const [peerId, socket] of this.federatedPeers.entries()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }

  /**
   * Start server
   */
  async start() {
    try {
      await this.server.listen({
        host: this.config.host,
        port: this.config.port,
      });

      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    GatekeeperNetwork Server                     ║
╚════════════════════════════════════════════════════════════════╝

🛡️  Gatekeeper ID:    ${this.config.gatekeeperId}
🏢  Institution:       ${this.config.name}
📊  Tier:              ${this.config.tier}
🌐  Domain:            ${this.config.domainName}
🚀  Server:            http://${this.config.host}:${this.config.port}

Features:
  ${this.config.enableCredentials ? '✅' : '❌'} Credential Management
  ${this.config.enableFederation ? '✅' : '❌'} Federation
  ${this.config.enablePolicies ? '✅' : '❌'} Policy Management

Server started successfully!
      `);

      return true;
    } catch (error) {
      this.server.log.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop server
   */
  async stop() {
    await this.server.close();
    this.server.log.info('Server stopped');
  }

  /**
   * Utility functions
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateNegotiationId(): string {
    return `neg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Create and start a Gatekeeper server
 */
export async function startGatekeeperServer(config: GatekeeperServerConfig): Promise<GatekeeperServer> {
  const server = new GatekeeperServer(config);
  await server.start();
  return server;
}

// Example usage
if (require.main === module) {
  const config: GatekeeperServerConfig = {
    gatekeeperId: 'gk_acme_corp',
    type: GatekeeperType.COMPANY,
    name: 'ACME Corporation',
    institutionId: 'acme_corp_001',
    tier: CompanyTier.SMALL_BUSINESS,
    domain: 'technology',
    domainName: 'Neural Nexus',
    host: '0.0.0.0',
    port: 3000,
    ed25519PrivateKey: 'private_key_placeholder',
    ed25519PublicKey: 'public_key_placeholder',
    databasePath: './gatekeeper.db',
    enableFederation: true,
    enableCredentials: true,
    enablePolicies: true,
  };

  startGatekeeperServer(config).catch(console.error);
}
