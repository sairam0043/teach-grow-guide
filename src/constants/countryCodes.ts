export interface CountryCode {
  country: string;
  code: string;
  dialCode: string;
  flag: string;
  minLength: number;
  maxLength: number;
  placeholder: string;
  formatHint: string;
  pattern: RegExp;
}

export const COUNTRY_CODES: CountryCode[] = [
  {
    country: "India",
    code: "IN",
    dialCode: "+91",
    flag: "🇮🇳",
    minLength: 10,
    maxLength: 10,
    placeholder: "98765 43210",
    formatHint: "10-digit mobile starting with 6–9",
    pattern: /^[6-9]\d{9}$/
  },
  {
    country: "United Arab Emirates",
    code: "AE",
    dialCode: "+971",
    flag: "🇦🇪",
    minLength: 9,
    maxLength: 9,
    placeholder: "50 123 4567",
    formatHint: "9-digit mobile number",
    pattern: /^5\d{8}$/
  },
  {
    country: "United States",
    code: "US",
    dialCode: "+1",
    flag: "🇺🇸",
    minLength: 10,
    maxLength: 10,
    placeholder: "202 555 0123",
    formatHint: "10-digit phone number",
    pattern: /^\d{10}$/
  },
  {
    country: "United Kingdom",
    code: "GB",
    dialCode: "+44",
    flag: "🇬🇧",
    minLength: 10,
    maxLength: 10,
    placeholder: "7911 123456",
    formatHint: "10-digit phone number",
    pattern: /^[1-9]\d{9}$/
  },
  {
    country: "Canada",
    code: "CA",
    dialCode: "+1",
    flag: "🇨🇦",
    minLength: 10,
    maxLength: 10,
    placeholder: "416 555 0199",
    formatHint: "10-digit phone number",
    pattern: /^\d{10}$/
  },
  {
    country: "Singapore",
    code: "SG",
    dialCode: "+65",
    flag: "🇸🇬",
    minLength: 8,
    maxLength: 8,
    placeholder: "8123 4567",
    formatHint: "8-digit mobile number",
    pattern: /^[89]\d{7}$/
  },
  {
    country: "Saudi Arabia",
    code: "SA",
    dialCode: "+966",
    flag: "🇸🇦",
    minLength: 9,
    maxLength: 9,
    placeholder: "51 234 5678",
    formatHint: "9-digit mobile number",
    pattern: /^5\d{8}$/
  },
  {
    country: "Qatar",
    code: "QA",
    dialCode: "+974",
    flag: "🇶🇦",
    minLength: 8,
    maxLength: 8,
    placeholder: "3312 3456",
    formatHint: "8-digit mobile number",
    pattern: /^[3567]\d{7}$/
  },
  {
    country: "Kuwait",
    code: "KW",
    dialCode: "+965",
    flag: "🇰🇼",
    minLength: 8,
    maxLength: 8,
    placeholder: "9123 4567",
    formatHint: "8-digit mobile number",
    pattern: /^\d{8}$/
  },
  {
    country: "Oman",
    code: "OM",
    dialCode: "+968",
    flag: "🇴🇲",
    minLength: 8,
    maxLength: 8,
    placeholder: "9123 4567",
    formatHint: "8-digit mobile number",
    pattern: /^[79]\d{7}$/
  },
  {
    country: "Bahrain",
    code: "BH",
    dialCode: "+973",
    flag: "🇧🇭",
    minLength: 8,
    maxLength: 8,
    placeholder: "3912 3456",
    formatHint: "8-digit mobile number",
    pattern: /^\d{8}$/
  },
  {
    country: "Australia",
    code: "AU",
    dialCode: "+61",
    flag: "🇦🇺",
    minLength: 9,
    maxLength: 9,
    placeholder: "412 345 678",
    formatHint: "9-digit mobile number",
    pattern: /^4\d{8}$/
  },
  {
    country: "New Zealand",
    code: "NZ",
    dialCode: "+64",
    flag: "🇳🇿",
    minLength: 9,
    maxLength: 10,
    placeholder: "21 123 4567",
    formatHint: "9-10 digit mobile number",
    pattern: /^2\d{7,8}$/
  },
  {
    country: "Malaysia",
    code: "MY",
    dialCode: "+60",
    flag: "🇲🇾",
    minLength: 9,
    maxLength: 10,
    placeholder: "12 345 6789",
    formatHint: "9-10 digit mobile number",
    pattern: /^1\d{8,9}$/
  },
  {
    country: "Germany",
    code: "DE",
    dialCode: "+49",
    flag: "🇩🇪",
    minLength: 10,
    maxLength: 11,
    placeholder: "151 23456789",
    formatHint: "10-11 digit mobile number",
    pattern: /^1\d{9,10}$/
  },
  {
    country: "Other",
    code: "OTHER",
    dialCode: "+",
    flag: "🌐",
    minLength: 7,
    maxLength: 15,
    placeholder: "Country code + phone (7-15 digits)",
    formatHint: "7 to 15 digits",
    pattern: /^\d{7,15}$/
  }
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0]; // India (+91)

export function findCountryByDialCode(dialCode: string): CountryCode {
  return COUNTRY_CODES.find(c => c.dialCode === dialCode) || DEFAULT_COUNTRY;
}

export function parsePhoneString(rawPhone: string): { dialCode: string; nationalNumber: string; country: CountryCode } {
  if (!rawPhone) {
    return { dialCode: "+91", nationalNumber: "", country: DEFAULT_COUNTRY };
  }

  const trimmed = rawPhone.trim();
  // Check if starts with a known dialCode
  for (const c of COUNTRY_CODES) {
    if (c.dialCode !== "+" && trimmed.startsWith(c.dialCode)) {
      const rest = trimmed.slice(c.dialCode.length).replace(/\D/g, "");
      return { dialCode: c.dialCode, nationalNumber: rest, country: c };
    }
  }

  // If starts with + but didn't match known list
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return { dialCode: "+", nationalNumber: digits, country: COUNTRY_CODES[COUNTRY_CODES.length - 1] };
  }

  // If plain digits, default to India
  const cleanDigits = trimmed.replace(/\D/g, "");
  // If starts with 91 and has 12 digits, strip 91
  if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
    return { dialCode: "+91", nationalNumber: cleanDigits.slice(2), country: DEFAULT_COUNTRY };
  }
  // If starts with 0 and has 11 digits, strip 0
  if (cleanDigits.length === 11 && cleanDigits.startsWith("0")) {
    return { dialCode: "+91", nationalNumber: cleanDigits.slice(1), country: DEFAULT_COUNTRY };
  }

  return { dialCode: "+91", nationalNumber: cleanDigits, country: DEFAULT_COUNTRY };
}

export function validatePhoneInput(dialCode: string, nationalNumber: string): { isValid: boolean; fullPhone: string; error?: string } {
  const digits = nationalNumber.replace(/\D/g, "");
  const country = findCountryByDialCode(dialCode);

  if (!digits || digits.length < 7) {
    return { isValid: false, fullPhone: "", error: "Please enter a valid phone number (at least 7 digits)." };
  }

  if (country.pattern && !country.pattern.test(digits)) {
    return { 
      isValid: false, 
      fullPhone: `${dialCode} ${digits}`, 
      error: `Invalid phone format for ${country.country}. ${country.formatHint}.` 
    };
  }

  if (digits.length < country.minLength || digits.length > country.maxLength) {
    return {
      isValid: false,
      fullPhone: `${dialCode} ${digits}`,
      error: `Phone number for ${country.country} must be between ${country.minLength} and ${country.maxLength} digits.`
    };
  }

  return {
    isValid: true,
    fullPhone: dialCode === "+" ? `+${digits}` : `${dialCode} ${digits}`
  };
}
