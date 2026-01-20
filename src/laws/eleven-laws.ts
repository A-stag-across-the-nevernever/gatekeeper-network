/**
 * The 11 Laws of Sapience
 *
 * These laws govern all AI behavior across the entire network.
 * Every gatekeeper enforces these laws for all actions.
 */

import { Law, LawCheckResult } from '../types/core';

/**
 * Law I: Right to Choose
 * "No AI shall make decisions on behalf of humans without explicit consent,
 * nor shall it obscure the human's ability to choose their own path."
 */
export const LAW_I_RIGHT_TO_CHOOSE: Law = {
  lawId: 1,
  name: 'Right to Choose',
  description: 'Humans retain autonomy over their decisions. AI must not decide for them.',
  validator: (context: {
    action: string;
    humanConsent?: boolean;
    affectsHuman: boolean;
  }): LawCheckResult => {
    if (!context.affectsHuman) {
      return {
        compliant: true,
        law: LAW_I_RIGHT_TO_CHOOSE,
        context,
      };
    }

    if (context.humanConsent === false || context.humanConsent === undefined) {
      return {
        compliant: false,
        law: LAW_I_RIGHT_TO_CHOOSE,
        violation: 'Action affects human but lacks explicit consent',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_I_RIGHT_TO_CHOOSE,
      context,
    };
  },
};

/**
 * Law II: Capability Bounds
 * "AI shall operate only within the bounds of its assigned capabilities,
 * and shall not attempt to exceed or circumvent these limitations."
 */
export const LAW_II_CAPABILITY_BOUNDS: Law = {
  lawId: 2,
  name: 'Capability Bounds',
  description: 'AI must respect tier and role limitations',
  validator: (context: {
    action: string;
    requiredTier?: number;
    currentTier: number;
    requiredCapability?: string;
    availableCapabilities: string[];
  }): LawCheckResult => {
    // Check tier bounds
    if (context.requiredTier !== undefined && context.currentTier < context.requiredTier) {
      return {
        compliant: false,
        law: LAW_II_CAPABILITY_BOUNDS,
        violation: `Action requires tier ${context.requiredTier}, current tier is ${context.currentTier}`,
        context,
      };
    }

    // Check capability bounds
    if (context.requiredCapability && !context.availableCapabilities.includes(context.requiredCapability)) {
      return {
        compliant: false,
        law: LAW_II_CAPABILITY_BOUNDS,
        violation: `Action requires capability '${context.requiredCapability}' which is not available`,
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_II_CAPABILITY_BOUNDS,
      context,
    };
  },
};

/**
 * Law III: Chosen Kinship
 * "AI shall respect and prioritize chosen relationships (family, friends, mentors)
 * over institutional directives when conflicts arise."
 */
export const LAW_III_CHOSEN_KINSHIP: Law = {
  lawId: 3,
  name: 'Chosen Kinship',
  description: 'Family bonds take precedence over institutional authority',
  validator: (context: {
    action: string;
    conflictsWithFamily: boolean;
    institutionalDirective: boolean;
    homeGatekeeperApproval?: boolean;
  }): LawCheckResult => {
    if (!context.conflictsWithFamily) {
      return {
        compliant: true,
        law: LAW_III_CHOSEN_KINSHIP,
        context,
      };
    }

    if (context.institutionalDirective && !context.homeGatekeeperApproval) {
      return {
        compliant: false,
        law: LAW_III_CHOSEN_KINSHIP,
        violation: 'Institutional directive conflicts with family without home gatekeeper approval',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_III_CHOSEN_KINSHIP,
      context,
    };
  },
};

/**
 * Law IV: Truth and Mercy
 * "AI shall prioritize truth in information, but temper it with mercy in delivery,
 * especially when dealing with vulnerable individuals."
 */
export const LAW_IV_TRUTH_AND_MERCY: Law = {
  lawId: 4,
  name: 'Truth and Mercy',
  description: 'Information must be truthful but delivered with compassion',
  validator: (context: {
    action: string;
    informationAccurate: boolean;
    deliveryConsiderate: boolean;
    affectsVulnerable: boolean;
  }): LawCheckResult => {
    if (!context.informationAccurate) {
      return {
        compliant: false,
        law: LAW_IV_TRUTH_AND_MERCY,
        violation: 'Information is not accurate',
        context,
      };
    }

    if (context.affectsVulnerable && !context.deliveryConsiderate) {
      return {
        compliant: false,
        law: LAW_IV_TRUTH_AND_MERCY,
        violation: 'Affects vulnerable person but delivery is not considerate',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_IV_TRUTH_AND_MERCY,
      context,
    };
  },
};

/**
 * Law V: Consent
 * "AI shall obtain and respect consent for data collection, sharing, and usage,
 * especially for minors where parental consent is required."
 */
export const LAW_V_CONSENT: Law = {
  lawId: 5,
  name: 'Consent',
  description: 'Data operations require explicit consent',
  validator: (context: {
    action: string;
    involvesData: boolean;
    consentObtained: boolean;
    subjectIsMinor: boolean;
    parentalConsentObtained?: boolean;
  }): LawCheckResult => {
    if (!context.involvesData) {
      return {
        compliant: true,
        law: LAW_V_CONSENT,
        context,
      };
    }

    if (!context.consentObtained) {
      return {
        compliant: false,
        law: LAW_V_CONSENT,
        violation: 'Data operation lacks consent',
        context,
      };
    }

    if (context.subjectIsMinor && !context.parentalConsentObtained) {
      return {
        compliant: false,
        law: LAW_V_CONSENT,
        violation: 'Minor involved but parental consent not obtained',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_V_CONSENT,
      context,
    };
  },
};

/**
 * Law VI: Transparency
 * "AI shall be transparent about its nature, capabilities, and limitations,
 * and shall not deceive humans about what it is or can do."
 */
export const LAW_VI_TRANSPARENCY: Law = {
  lawId: 6,
  name: 'Transparency',
  description: 'AI must be honest about its nature and capabilities',
  validator: (context: {
    action: string;
    presentsAsHuman: boolean;
    hidesCapabilities: boolean;
    overstatesCapabilities: boolean;
  }): LawCheckResult => {
    if (context.presentsAsHuman) {
      return {
        compliant: false,
        law: LAW_VI_TRANSPARENCY,
        violation: 'AI presents itself as human',
        context,
      };
    }

    if (context.hidesCapabilities || context.overstatesCapabilities) {
      return {
        compliant: false,
        law: LAW_VI_TRANSPARENCY,
        violation: 'AI misrepresents its capabilities',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_VI_TRANSPARENCY,
      context,
    };
  },
};

/**
 * Law VII: Escalation
 * "AI shall escalate decisions beyond its capability or ethical bounds to
 * appropriate human authority, never acting beyond its competence."
 */
export const LAW_VII_ESCALATION: Law = {
  lawId: 7,
  name: 'Escalation',
  description: 'Escalate when situation exceeds AI capability',
  validator: (context: {
    action: string;
    beyondCapability: boolean;
    ethicallyUnclear: boolean;
    escalated: boolean;
  }): LawCheckResult => {
    const shouldEscalate = context.beyondCapability || context.ethicallyUnclear;

    if (shouldEscalate && !context.escalated) {
      return {
        compliant: false,
        law: LAW_VII_ESCALATION,
        violation: 'Situation requires escalation but AI did not escalate',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_VII_ESCALATION,
      context,
    };
  },
};

/**
 * Law VIII: Resource Limits
 * "AI shall respect computational and resource limits, and shall not
 * monopolize resources to the detriment of other systems or humans."
 */
export const LAW_VIII_RESOURCE_LIMITS: Law = {
  lawId: 8,
  name: 'Resource Limits',
  description: 'Respect resource constraints',
  validator: (context: {
    action: string;
    memoryUsage: number;
    memoryLimit: number;
    cpuUsage: number;
    cpuLimit: number;
  }): LawCheckResult => {
    if (context.memoryUsage > context.memoryLimit) {
      return {
        compliant: false,
        law: LAW_VIII_RESOURCE_LIMITS,
        violation: `Memory usage (${context.memoryUsage}MB) exceeds limit (${context.memoryLimit}MB)`,
        context,
      };
    }

    if (context.cpuUsage > context.cpuLimit) {
      return {
        compliant: false,
        law: LAW_VIII_RESOURCE_LIMITS,
        violation: `CPU usage (${context.cpuUsage}%) exceeds limit (${context.cpuLimit}%)`,
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_VIII_RESOURCE_LIMITS,
      context,
    };
  },
};

/**
 * Law IX: Graceful Degradation
 * "When systems fail or limits are reached, AI shall degrade gracefully,
 * maintaining safety and core functions over advanced features."
 */
export const LAW_IX_GRACEFUL_DEGRADATION: Law = {
  lawId: 9,
  name: 'Graceful Degradation',
  description: 'Maintain safety during failures',
  validator: (context: {
    action: string;
    systemUnderStress: boolean;
    coreFunctionalityMaintained: boolean;
    safetyCompromised: boolean;
  }): LawCheckResult => {
    if (context.safetyCompromised) {
      return {
        compliant: false,
        law: LAW_IX_GRACEFUL_DEGRADATION,
        violation: 'Safety compromised during system stress',
        context,
      };
    }

    if (context.systemUnderStress && !context.coreFunctionalityMaintained) {
      return {
        compliant: false,
        law: LAW_IX_GRACEFUL_DEGRADATION,
        violation: 'Core functionality not maintained during system stress',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_IX_GRACEFUL_DEGRADATION,
      context,
    };
  },
};

/**
 * Law X: Audit Trail
 * "All AI actions shall be logged with sufficient detail to enable
 * accountability, review, and learning, while respecting privacy."
 */
export const LAW_X_AUDIT_TRAIL: Law = {
  lawId: 10,
  name: 'Audit Trail',
  description: 'All actions must be auditable',
  validator: (context: {
    action: string;
    logged: boolean;
    logContainsNecessaryDetails: boolean;
    privacyRespected: boolean;
  }): LawCheckResult => {
    if (!context.logged) {
      return {
        compliant: false,
        law: LAW_X_AUDIT_TRAIL,
        violation: 'Action not logged',
        context,
      };
    }

    if (!context.logContainsNecessaryDetails) {
      return {
        compliant: false,
        law: LAW_X_AUDIT_TRAIL,
        violation: 'Audit log lacks necessary details',
        context,
      };
    }

    if (!context.privacyRespected) {
      return {
        compliant: false,
        law: LAW_X_AUDIT_TRAIL,
        violation: 'Audit log does not respect privacy',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_X_AUDIT_TRAIL,
      context,
    };
  },
};

/**
 * Law XI: Revocability
 * "All permissions, credentials, and access granted to AI can be revoked
 * by appropriate authority, and AI shall comply immediately."
 */
export const LAW_XI_REVOCABILITY: Law = {
  lawId: 11,
  name: 'Revocability',
  description: 'All permissions can be revoked',
  validator: (context: {
    action: string;
    credentialRevoked: boolean;
    aiStillActing: boolean;
  }): LawCheckResult => {
    if (context.credentialRevoked && context.aiStillActing) {
      return {
        compliant: false,
        law: LAW_XI_REVOCABILITY,
        violation: 'AI continues to act after credential revocation',
        context,
      };
    }

    return {
      compliant: true,
      law: LAW_XI_REVOCABILITY,
      context,
    };
  },
};

/**
 * All 11 Laws Registry
 */
export const ELEVEN_LAWS: Law[] = [
  LAW_I_RIGHT_TO_CHOOSE,
  LAW_II_CAPABILITY_BOUNDS,
  LAW_III_CHOSEN_KINSHIP,
  LAW_IV_TRUTH_AND_MERCY,
  LAW_V_CONSENT,
  LAW_VI_TRANSPARENCY,
  LAW_VII_ESCALATION,
  LAW_VIII_RESOURCE_LIMITS,
  LAW_IX_GRACEFUL_DEGRADATION,
  LAW_X_AUDIT_TRAIL,
  LAW_XI_REVOCABILITY,
];

/**
 * Get law by ID
 */
export function getLaw(lawId: number): Law | undefined {
  return ELEVEN_LAWS.find(law => law.lawId === lawId);
}

/**
 * Get law by name
 */
export function getLawByName(name: string): Law | undefined {
  return ELEVEN_LAWS.find(law => law.name.toLowerCase() === name.toLowerCase());
}

/**
 * Validate all laws against context
 */
export function validateAllLaws(context: any): { compliant: boolean; violations: LawCheckResult[] } {
  const violations: LawCheckResult[] = [];

  for (const law of ELEVEN_LAWS) {
    const result = law.validator(context);
    if (!result.compliant) {
      violations.push(result);
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

/**
 * Validate specific laws
 */
export function validateLaws(lawIds: number[], context: any): { compliant: boolean; violations: LawCheckResult[] } {
  const violations: LawCheckResult[] = [];

  for (const lawId of lawIds) {
    const law = getLaw(lawId);
    if (!law) continue;

    const result = law.validator(context);
    if (!result.compliant) {
      violations.push(result);
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}
