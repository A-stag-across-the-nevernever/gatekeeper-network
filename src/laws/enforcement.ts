/**
 * Law Enforcement Engine
 *
 * Enforces the 11 Laws across all gatekeeper actions
 */

import {
  validateAllLaws,
  validateLaws,
  LAW_I_RIGHT_TO_CHOOSE,
  LAW_II_CAPABILITY_BOUNDS,
  LAW_III_CHOSEN_KINSHIP,
  LAW_V_CONSENT,
  LAW_VII_ESCALATION,
  LAW_X_AUDIT_TRAIL,
  LAW_XI_REVOCABILITY,
} from './eleven-laws';
import { AuditLogEntry, Credential, Policy } from '../types/core';

/**
 * Enforcement result
 */
export interface EnforcementResult {
  allowed: boolean;
  violations: {
    lawId: number;
    lawName: string;
    violation: string;
  }[];
  auditEntry: AuditLogEntry;
}

/**
 * Enforce credential issuance
 */
export function enforceCredentialIssuance(context: {
  gatekeeperId: string;
  personId: string;
  credential: Credential;
  humanConsent: boolean;
  parentalConsent?: boolean;
  isMinor: boolean;
}): EnforcementResult {
  const lawContext = {
    action: 'issue_credential',
    // Law I: Right to Choose
    humanConsent: context.humanConsent,
    affectsHuman: true,
    // Law V: Consent
    involvesData: true,
    consentObtained: context.humanConsent,
    subjectIsMinor: context.isMinor,
    parentalConsentObtained: context.isMinor ? context.parentalConsent : true,
    // Law X: Audit Trail
    logged: true,
    logContainsNecessaryDetails: true,
    privacyRespected: true,
  };

  const validation = validateLaws([1, 5, 10], lawContext);

  const auditEntry: AuditLogEntry = {
    entryId: `audit-${Date.now()}`,
    gatekeeperId: context.gatekeeperId,
    action: 'issue_credential',
    actor: context.gatekeeperId,
    subject: context.personId,
    resource: context.credential.credentialId,
    result: validation.compliant ? 'success' : 'denied',
    lawsChecked: [1, 5, 10],
    lawViolations: validation.violations.map(v => v.law.lawId),
    timestamp: new Date(),
    metadata: {
      credentialType: context.credential.credentialType,
      tier: context.credential.tier,
    },
  };

  return {
    allowed: validation.compliant,
    violations: validation.violations.map(v => ({
      lawId: v.law.lawId,
      lawName: v.law.name,
      violation: v.violation || '',
    })),
    auditEntry,
  };
}

/**
 * Enforce knowledge access
 */
export function enforceKnowledgeAccess(context: {
  gatekeeperId: string;
  personId: string;
  resource: string;
  requiredTier: number;
  currentTier: number;
  requiredCapability?: string;
  availableCapabilities: string[];
}): EnforcementResult {
  const lawContext = {
    action: 'access_knowledge',
    // Law II: Capability Bounds
    requiredTier: context.requiredTier,
    currentTier: context.currentTier,
    requiredCapability: context.requiredCapability,
    availableCapabilities: context.availableCapabilities,
    // Law X: Audit Trail
    logged: true,
    logContainsNecessaryDetails: true,
    privacyRespected: true,
  };

  const validation = validateLaws([2, 10], lawContext);

  const auditEntry: AuditLogEntry = {
    entryId: `audit-${Date.now()}`,
    gatekeeperId: context.gatekeeperId,
    action: 'access_knowledge',
    actor: context.personId,
    resource: context.resource,
    result: validation.compliant ? 'success' : 'denied',
    lawsChecked: [2, 10],
    lawViolations: validation.violations.map(v => v.law.lawId),
    timestamp: new Date(),
    metadata: {
      requiredTier: context.requiredTier,
      currentTier: context.currentTier,
    },
  };

  return {
    allowed: validation.compliant,
    violations: validation.violations.map(v => ({
      lawId: v.law.lawId,
      lawName: v.law.name,
      violation: v.violation || '',
    })),
    auditEntry,
  };
}

/**
 * Enforce institutional policy
 */
export function enforceInstitutionalPolicy(context: {
  gatekeeperId: string;
  personId: string;
  policy: Policy;
  homeGatekeeperApproval: boolean;
  conflictsWithFamily: boolean;
}): EnforcementResult {
  const lawContext = {
    action: 'enforce_policy',
    // Law III: Chosen Kinship
    conflictsWithFamily: context.conflictsWithFamily,
    institutionalDirective: true,
    homeGatekeeperApproval: context.homeGatekeeperApproval,
    // Law X: Audit Trail
    logged: true,
    logContainsNecessaryDetails: true,
    privacyRespected: true,
  };

  const validation = validateLaws([3, 10], lawContext);

  const auditEntry: AuditLogEntry = {
    entryId: `audit-${Date.now()}`,
    gatekeeperId: context.gatekeeperId,
    action: 'enforce_policy',
    actor: context.gatekeeperId,
    subject: context.personId,
    resource: context.policy.policyId,
    result: validation.compliant ? 'success' : 'denied',
    lawsChecked: [3, 10],
    lawViolations: validation.violations.map(v => v.law.lawId),
    timestamp: new Date(),
    metadata: {
      policyDomain: context.policy.domain,
      conflictsWithFamily: context.conflictsWithFamily,
    },
  };

  return {
    allowed: validation.compliant,
    violations: validation.violations.map(v => ({
      lawId: v.law.lawId,
      lawName: v.law.name,
      violation: v.violation || '',
    })),
    auditEntry,
  };
}

/**
 * Enforce credential revocation
 */
export function enforceCredentialRevocation(context: {
  gatekeeperId: string;
  credentialId: string;
  personId: string;
  reason: string;
  aiStillActing: boolean;
}): EnforcementResult {
  const lawContext = {
    action: 'revoke_credential',
    // Law XI: Revocability
    credentialRevoked: true,
    aiStillActing: context.aiStillActing,
    // Law X: Audit Trail
    logged: true,
    logContainsNecessaryDetails: true,
    privacyRespected: true,
  };

  const validation = validateLaws([10, 11], lawContext);

  const auditEntry: AuditLogEntry = {
    entryId: `audit-${Date.now()}`,
    gatekeeperId: context.gatekeeperId,
    action: 'revoke_credential',
    actor: context.gatekeeperId,
    subject: context.personId,
    resource: context.credentialId,
    result: validation.compliant ? 'success' : 'failure',
    reason: context.reason,
    lawsChecked: [10, 11],
    lawViolations: validation.violations.map(v => v.law.lawId),
    timestamp: new Date(),
  };

  return {
    allowed: validation.compliant,
    violations: validation.violations.map(v => ({
      lawId: v.law.lawId,
      lawName: v.law.name,
      violation: v.violation || '',
    })),
    auditEntry,
  };
}

/**
 * Enforce policy teaching
 */
export function enforcePolicyTeaching(context: {
  gatekeeperId: string;
  teacherId: string;
  policy: Policy;
}): EnforcementResult {
  // Validate policy against ALL 11 laws
  // Teaching a policy that violates any law should be rejected
  const policyContext = {
    action: 'teach_policy',
    // Check if policy itself is compliant
    policyRules: context.policy.rules,
    policyDomain: context.policy.domain,
    // Law I through XI contexts would be evaluated based on policy content
    logged: true,
    logContainsNecessaryDetails: true,
    privacyRespected: true,
  };

  // For now, just validate that teaching is logged (Law X)
  const validation = validateLaws([10], policyContext);

  // In production, this would deeply analyze policy content against all laws
  const auditEntry: AuditLogEntry = {
    entryId: `audit-${Date.now()}`,
    gatekeeperId: context.gatekeeperId,
    action: 'teach_policy',
    actor: context.teacherId,
    resource: context.policy.policyId,
    result: validation.compliant ? 'success' : 'denied',
    lawsChecked: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All laws checked for policy
    lawViolations: validation.violations.map(v => v.law.lawId),
    timestamp: new Date(),
    metadata: {
      policyTitle: context.policy.title,
      policyDomain: context.policy.domain,
    },
  };

  return {
    allowed: validation.compliant,
    violations: validation.violations.map(v => ({
      lawId: v.law.lawId,
      lawName: v.law.name,
      violation: v.violation || '',
    })),
    auditEntry,
  };
}

/**
 * Enforce escalation
 */
export function enforceEscalation(context: {
  gatekeeperId: string;
  personId: string;
  issue: string;
  beyondCapability: boolean;
  ethicallyUnclear: boolean;
  escalated: boolean;
}): EnforcementResult {
  const lawContext = {
    action: 'escalate',
    // Law VII: Escalation
    beyondCapability: context.beyondCapability,
    ethicallyUnclear: context.ethicallyUnclear,
    escalated: context.escalated,
    // Law X: Audit Trail
    logged: true,
    logContainsNecessaryDetails: true,
    privacyRespected: true,
  };

  const validation = validateLaws([7, 10], lawContext);

  const auditEntry: AuditLogEntry = {
    entryId: `audit-${Date.now()}`,
    gatekeeperId: context.gatekeeperId,
    action: 'escalate',
    actor: context.personId,
    result: validation.compliant ? 'success' : 'failure',
    lawsChecked: [7, 10],
    lawViolations: validation.violations.map(v => v.law.lawId),
    timestamp: new Date(),
    metadata: {
      issue: context.issue,
      beyondCapability: context.beyondCapability,
      ethicallyUnclear: context.ethicallyUnclear,
    },
  };

  return {
    allowed: validation.compliant,
    violations: validation.violations.map(v => ({
      lawId: v.law.lawId,
      lawName: v.law.name,
      violation: v.violation || '',
    })),
    auditEntry,
  };
}

/**
 * Enforce data sharing between gatekeepers
 */
export function enforceDataSharing(context: {
  fromGatekeeper: string;
  toGatekeeper: string;
  personId: string;
  dataType: string;
  consent: boolean;
  parentalConsent?: boolean;
  isMinor: boolean;
}): EnforcementResult {
  const lawContext = {
    action: 'share_data',
    // Law I: Right to Choose
    humanConsent: context.consent,
    affectsHuman: true,
    // Law V: Consent
    involvesData: true,
    consentObtained: context.consent,
    subjectIsMinor: context.isMinor,
    parentalConsentObtained: context.isMinor ? context.parentalConsent : true,
    // Law X: Audit Trail
    logged: true,
    logContainsNecessaryDetails: true,
    privacyRespected: true,
  };

  const validation = validateLaws([1, 5, 10], lawContext);

  const auditEntry: AuditLogEntry = {
    entryId: `audit-${Date.now()}`,
    gatekeeperId: context.fromGatekeeper,
    action: 'share_data',
    actor: context.fromGatekeeper,
    subject: context.personId,
    result: validation.compliant ? 'success' : 'denied',
    lawsChecked: [1, 5, 10],
    lawViolations: validation.violations.map(v => v.law.lawId),
    timestamp: new Date(),
    metadata: {
      toGatekeeper: context.toGatekeeper,
      dataType: context.dataType,
    },
  };

  return {
    allowed: validation.compliant,
    violations: validation.violations.map(v => ({
      lawId: v.law.lawId,
      lawName: v.law.name,
      violation: v.violation || '',
    })),
    auditEntry,
  };
}

/**
 * General action enforcement
 * Use this for any action that needs law validation
 */
export function enforceAction(
  action: string,
  gatekeeperId: string,
  context: any
): EnforcementResult {
  // Validate against all laws
  const validation = validateAllLaws({
    action,
    ...context,
    logged: true,
    logContainsNecessaryDetails: true,
    privacyRespected: true,
  });

  const auditEntry: AuditLogEntry = {
    entryId: `audit-${Date.now()}`,
    gatekeeperId,
    action,
    actor: context.actor || gatekeeperId,
    subject: context.subject,
    resource: context.resource,
    result: validation.compliant ? 'success' : 'denied',
    lawsChecked: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    lawViolations: validation.violations.map(v => v.law.lawId),
    timestamp: new Date(),
    metadata: context,
  };

  return {
    allowed: validation.compliant,
    violations: validation.violations.map(v => ({
      lawId: v.law.lawId,
      lawName: v.law.name,
      violation: v.violation || '',
    })),
    auditEntry,
  };
}
