/**
 * International Phone Validator & Normalizer
 * Enforces ITU-T E.164 rules, country-specific mobile patterns,
 * and rejects malformed/short values like "01".
 */

const COUNTRY_RULES = [
  { code: 'IN', dial: '+91', min: 10, max: 10, pattern: /^[6-9]\d{9}$/, name: 'India' },
  { code: 'AE', dial: '+971', min: 9, max: 9, pattern: /^5\d{8}$/, name: 'UAE' },
  { code: 'US', dial: '+1', min: 10, max: 10, pattern: /^\d{10}$/, name: 'USA' },
  { code: 'CA', dial: '+1', min: 10, max: 10, pattern: /^\d{10}$/, name: 'Canada' },
  { code: 'GB', dial: '+44', min: 10, max: 10, pattern: /^[1-9]\d{9}$/, name: 'UK' },
  { code: 'SG', dial: '+65', min: 8, max: 8, pattern: /^[89]\d{7}$/, name: 'Singapore' },
  { code: 'SA', dial: '+966', min: 9, max: 9, pattern: /^5\d{8}$/, name: 'Saudi Arabia' },
  { code: 'QA', dial: '+974', min: 8, max: 8, pattern: /^[3567]\d{7}$/, name: 'Qatar' },
  { code: 'KW', dial: '+965', min: 8, max: 8, pattern: /^\d{8}$/, name: 'Kuwait' },
  { code: 'OM', dial: '+968', min: 8, max: 8, pattern: /^[79]\d{7}$/, name: 'Oman' },
  { code: 'BH', dial: '+973', min: 8, max: 8, pattern: /^\d{8}$/, name: 'Bahrain' },
  { code: 'AU', dial: '+61', min: 9, max: 9, pattern: /^4\d{8}$/, name: 'Australia' },
  { code: 'NZ', dial: '+64', min: 9, max: 10, pattern: /^2\d{7,8}$/, name: 'New Zealand' },
  { code: 'MY', dial: '+60', min: 9, max: 10, pattern: /^1\d{8,9}$/, name: 'Malaysia' },
  { code: 'DE', dial: '+49', min: 10, max: 11, pattern: /^1\d{9,10}$/, name: 'Germany' }
];

/**
 * Validates and normalizes any international or Indian phone number.
 * Returns { valid: boolean, normalized: string, error?: string }
 */
function validateAndNormalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Phone number is required.' };
  }

  const trimmed = rawPhone.trim();
  const allDigits = trimmed.replace(/\D/g, '');

  // Absolute minimum check: ITU-T E.164 requires at least 7 digits worldwide
  if (!allDigits || allDigits.length < 7) {
    return {
      valid: false,
      error: 'Please enter a valid mobile number (at least 7 to 15 digits).'
    };
  }

  // 1. Check if number starts with an explicit dial code (+91, +971, +1, etc.)
  for (const rule of COUNTRY_RULES) {
    if (trimmed.startsWith(rule.dial)) {
      const national = trimmed.slice(rule.dial.length).replace(/\D/g, '');
      if (rule.pattern && !rule.pattern.test(national)) {
        return {
          valid: false,
          error: `Invalid phone format for ${rule.name}. Expected ${rule.min} digits.`
        };
      }
      if (national.length < rule.min || national.length > rule.max) {
        return {
          valid: false,
          error: `Phone number for ${rule.name} must be ${rule.min} digits.`
        };
      }
      return { valid: true, normalized: `${rule.dial} ${national}` };
    }
  }

  // 2. If it starts with "+" but country is not in the predefined top list
  if (trimmed.startsWith('+')) {
    if (allDigits.length < 7 || allDigits.length > 15) {
      return {
        valid: false,
        error: 'International phone numbers must be between 7 and 15 digits.'
      };
    }
    return { valid: true, normalized: `+${allDigits}` };
  }

  // 3. If raw digits without "+", check if it's an Indian number (default)
  let indianDigits = allDigits;
  if (indianDigits.length === 12 && indianDigits.startsWith('91')) {
    indianDigits = indianDigits.slice(2);
  } else if (indianDigits.length === 11 && indianDigits.startsWith('0')) {
    indianDigits = indianDigits.slice(1);
  }

  if (indianDigits.length === 10 && /^[6-9]\d{9}$/.test(indianDigits)) {
    return { valid: true, normalized: `+91 ${indianDigits}` };
  }

  // 4. Fallback for general valid digits (7-15 digits)
  if (allDigits.length >= 7 && allDigits.length <= 15) {
    return { valid: true, normalized: `+${allDigits}` };
  }

  return {
    valid: false,
    error: 'Please enter a valid mobile number with country code (e.g. +91 9876543210).'
  };
}

/**
 * Returns candidate formats to search in MongoDB for duplicate checks.
 */
function getPhoneCandidates(normalizedPhone) {
  if (!normalizedPhone) return [];
  const digits = normalizedPhone.replace(/\D/g, '');
  const candidates = [
    normalizedPhone,
    normalizedPhone.replace(/\s+/g, ''),
    digits,
    `+${digits}`
  ];

  // If Indian 10 digits
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    candidates.push(last10);
    candidates.push(`0${last10}`);
    candidates.push(`+91 ${last10}`);
    candidates.push(`+91${last10}`);
  }

  return Array.from(new Set(candidates));
}

module.exports = {
  validateAndNormalizePhone,
  getPhoneCandidates
};
