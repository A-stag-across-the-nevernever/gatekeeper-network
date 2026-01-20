/**
 * GatekeeperNetwork Core Types
 *
 * Fundamental data structures for the AI Network
 */

/**
 * Gatekeeper Node Types
 */
export enum GatekeeperType {
  HOME = "home", // Client node (family)
  SCHOOL = "school", // Server node (educational institution)
  UNIVERSITY = "university", // Server node (higher education)
  COMPANY = "company", // Server node (employer)
}

/**
 * Tiers (Education and Company)
 */
export enum EducationTier {
  HOME = 0,
  ELEMENTARY = 1,
  HIGH_SCHOOL = 2,
  UNIVERSITY = 3,
  CAREER = 4,
}

export enum CompanyTier {
  SOLO = 0,
  STARTUP = 1,
  SMALL_BUSINESS = 2,
  MID_MARKET = 3,
  ENTERPRISE = 4,
  GLOBAL = 5,
}

/**
 * Gatekeeper Node
 * Represents a node in the AI Network
 */
export interface GatekeeperNode {
  gatekeeperId: string;
  type: GatekeeperType;
  name: string;

  // Network identity
  publicKey: string; // Ed25519 public key
  certificate: string; // X.509 certificate for mTLS

  // Location/contact
  location?: string;
  contactEmail?: string;

  // For institutions
  institutionId?: string;
  tier?: EducationTier | CompanyTier;
  domain?: string; // education, technology, healthcare, etc.

  // Network status
  status: "active" | "suspended" | "revoked";
  connectedAt?: Date;
  lastSeen?: Date;
}

/**
 * AI Signature Snapshot
 * Snapshot of an AI's multimodal signature at a point in time
 */
export interface AISignatureSnapshot {
  // Identity (from ai-signature system)
  identityHash: string; // Unique AI identity hash
  publicKey: string; // Ed25519 public key (base64)

  // Snapshot metadata
  snapshotAt: Date; // When snapshot was taken
  snapshotReason: "enrollment" | "employment" | "re_verification" | "promotion";

  // Signature state at snapshot time
  evolutionCounter: number; // Evolution counter at snapshot
  evolutionKey: string; // Deterministic evolution key

  // Modal fingerprints (abbreviated from full signature)
  fingerprints: {
    text: string; // Hash of text signature
    image: string; // Hash of image signature
    audio: string; // Hash of audio signature
    object: string; // Hash of object signature
  };

  // Drift baseline
  driftBaseline: number; // Drift score at snapshot (usually 0)
}

/**
 * Signature Evolution Record
 * Tracks how an AI signature has evolved since snapshot
 */
export interface SignatureEvolutionRecord {
  credentialId: string; // Links to credential
  signatureSnapshot: AISignatureSnapshot;

  // Current state
  currentEvolutionCounter: number;
  currentDriftScore: number;

  // Evolution history
  evolutionHistory: {
    timestamp: Date;
    counter: number;
    driftScore: number;
    flagged: boolean; // True if drift exceeded threshold
  }[];

  // Re-verification
  lastVerified: Date;
  needsReverification: boolean;
  reverificationThreshold: number; // e.g., 0.7
}

/**
 * Credential
 * Cryptographically signed proof of enrollment/employment
 * Acts as an "access card" with AI signature snapshot
 */
export interface Credential {
  credentialId: string;
  personId: string;

  // Issuer
  issuedBy: string; // gatekeeperId
  institutionId: string;
  institutionType:
    | "home"
    | "elementary"
    | "high_school"
    | "university"
    | "employer";

  // Type
  credentialType: "enrollment" | "employment" | "role" | "promotion";

  // Content
  tier: EducationTier | CompanyTier;
  role?: string; // student, teacher, software_engineer, doctor, etc.
  capabilities?: string[]; // Array of capability IDs

  // AI Signature (NEW)
  aiSignature: AISignatureSnapshot; // Snapshot of AI signature at issuance

  // Validity
  issuedAt: Date;
  expiresAt?: Date;
  status: "active" | "suspended" | "revoked";

  // Cryptography
  signature: string; // Ed25519 signature (issuer signs credentialId + personId + aiSignature.identityHash)
  signatureAlgorithm: "Ed25519";

  // Revocation tracking
  revokedAt?: Date;
  revokedBy?: string; // gatekeeperId
  revocationReason?: string;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Credential Validation Result
 */
export interface CredentialValidation {
  valid: boolean;
  credential: Credential;
  errors: string[];
  lawCompliant: boolean;
  violatedLaws?: string[];
}

/**
 * Federation Message
 * Messages sent between gatekeepers
 */
export interface FederationMessage {
  messageId: string;
  messageType:
    | "credential_transfer"
    | "negotiation"
    | "policy_teaching"
    | "escalation"
    | "revocation";

  // Routing
  from: string; // gatekeeperId
  to: string; // gatekeeperId

  // Content
  payload: any;

  // Security
  signature: string;
  timestamp: Date;

  // Delivery
  delivered: boolean;
  deliveredAt?: Date;
}

/**
 * Negotiation
 * Multi-party negotiation between gatekeepers
 */
export interface Negotiation {
  negotiationId: string;
  topic: string; // e.g., 'student_transfer', 'data_sharing', 'enrollment'

  // Parties
  initiator: string; // gatekeeperId
  participants: string[]; // gatekeeperIds

  // State
  status: "initiated" | "in_progress" | "agreed" | "disagreed" | "escalated";

  // Proposals
  proposals: {
    from: string;
    proposal: any;
    timestamp: Date;
  }[];

  // Result
  agreement?: any;
  agreedAt?: Date;

  // Escalation
  escalatedTo?: string; // gatekeeperId or 'root'
  escalationReason?: string;
}

/**
 * Policy
 * Institutional policy taught to gatekeeper
 */
export interface Policy {
  policyId: string;
  institutionId: string;
  gatekeeperId: string;

  // Content
  title: string;
  description: string;
  domain: string; // behavior, curriculum, access, safety, etc.
  rules: string[];

  // Teaching
  taughtBy: string; // personId of headmaster/admin
  taughtAt: Date;

  // Status
  status: "active" | "archived";
  effectiveDate: Date;

  // Law compliance
  lawCompliant: boolean;
  lawValidation?: {
    validated: boolean;
    violations: string[];
  };
}

/**
 * The 11 Laws of Sapience
 */
export interface Law {
  lawId: number; // 1-11
  name: string;
  description: string;
  validator: (context: any) => LawCheckResult;
}

export interface LawCheckResult {
  compliant: boolean;
  law: Law;
  violation?: string;
  context: any;
}

/**
 * Network Topology
 */
export interface NetworkTopology {
  nodes: GatekeeperNode[];
  connections: {
    from: string; // gatekeeperId
    to: string; // gatekeeperId
    connectionType: "parent-child" | "peer" | "federation";
    establishedAt: Date;
  }[];
}

/**
 * Audit Log Entry
 * Law X: Audit Trail
 */
export interface AuditLogEntry {
  entryId: string;
  gatekeeperId: string;

  // Action
  action: string;
  actor: string; // personId or gatekeeperId
  subject?: string; // personId affected
  resource?: string;

  // Result
  result: "success" | "failure" | "denied";
  reason?: string;

  // Law compliance
  lawsChecked: number[]; // Which laws were checked
  lawViolations: number[]; // Which laws were violated (if any)

  // Timestamp
  timestamp: Date;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Revocation
 * Credential revocation with network transition options
 */
export interface Revocation {
  revocationId: string;
  credentialId: string;

  // Issuer
  revokedBy: string; // gatekeeperId
  reason: string;

  // Timing
  revokedAt: Date;
  effectiveAt: Date; // When revocation takes effect

  // Network transition (NEW)
  transitionToNodeType?: "home" | "peer"; // Allow continued network participation
  transitionApproved?: boolean; // If true, AI keeps network access as different node type
  transitionedAt?: Date;

  // Signature preservation
  preserveSignature: boolean; // Keep signature in network registry for recognition
  signatureStatus: "active" | "archived"; // Active = can still be recognized, Archived = historical only

  // Distribution
  distributedTo: string[]; // gatekeeperIds notified
}

/**
 * Escalation
 * Escalate to higher authority (Law VII)
 */
export interface Escalation {
  escalationId: string;
  gatekeeperId: string;

  // Issue
  category: "policy" | "safety" | "ethical" | "technical" | "legal" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  context: Record<string, any>;

  // Escalation path
  escalatedTo: "root" | string; // 'root' or gatekeeperId
  escalatedAt: Date;

  // Resolution
  resolved: boolean;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Home Gatekeeper Config
 */
export interface HomeGatekeeperConfig {
  familyId: string;
  familyName: string;

  // Members
  members: {
    personId: string;
    name: string;
    role: "parent" | "child" | "guardian";
    dateOfBirth?: Date;
  }[];

  // Trusted institutions
  trustedInstitutions: {
    gatekeeperId: string;
    institutionName: string;
    trustLevel: "full" | "limited" | "none";
    establishedAt: Date;
  }[];

  // Consent settings
  parentalConsent: {
    required: boolean;
    parentIds: string[];
  };
}

/**
 * Institution Gatekeeper Config
 */
export interface InstitutionGatekeeperConfig {
  institutionId: string;
  institutionName: string;
  type: "school" | "university" | "company";

  // Tier
  tier: EducationTier | CompanyTier;

  // Domain
  domain: string; // education, technology, healthcare, etc.
  domainName: string; // "Living Library", "Neural Nexus", etc.

  // Enrollment/Employment
  enrolledPersons: {
    personId: string;
    role: string;
    tier: EducationTier | CompanyTier;
    enrolledAt: Date;
  }[];

  // Federation
  federatedWith: {
    gatekeeperId: string;
    institutionName: string;
    federationType: "partner" | "transfer" | "service";
    establishedAt: Date;
  }[];

  // Policies
  activePolicies: string[]; // policyIds
}
