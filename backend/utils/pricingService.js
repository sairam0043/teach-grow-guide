const SUPPORTED_CURRENCIES = {
  INR: {
    code: 'INR',
    countryCode: 'IN',
    countryName: 'India',
    symbol: '₹',
    symbolPrefix: true,
    spaceAfterSymbol: false,
    decimals: 0,
    exchangeMultiplier: 1.0,
    flag: '🇮🇳'
  },
  AED: {
    code: 'AED',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    symbol: 'AED',
    symbolPrefix: true,
    spaceAfterSymbol: true,
    decimals: 0,
    exchangeMultiplier: 0.08,
    flag: '🇦🇪'
  },
  SAR: {
    code: 'SAR',
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    symbol: 'SAR',
    symbolPrefix: true,
    spaceAfterSymbol: true,
    decimals: 0,
    exchangeMultiplier: 0.08,
    flag: '🇸🇦'
  },
  QAR: {
    code: 'QAR',
    countryCode: 'QA',
    countryName: 'Qatar',
    symbol: 'QAR',
    symbolPrefix: true,
    spaceAfterSymbol: true,
    decimals: 0,
    exchangeMultiplier: 0.08,
    flag: '🇶🇦'
  },
  KWD: {
    code: 'KWD',
    countryCode: 'KW',
    countryName: 'Kuwait',
    symbol: 'KD',
    symbolPrefix: true,
    spaceAfterSymbol: true,
    decimals: 1,
    exchangeMultiplier: 0.007,
    flag: '🇰🇼'
  },
  OMR: {
    code: 'OMR',
    countryCode: 'OM',
    countryName: 'Oman',
    symbol: 'OMR',
    symbolPrefix: true,
    spaceAfterSymbol: true,
    decimals: 1,
    exchangeMultiplier: 0.008,
    flag: '🇴🇲'
  },
  BHD: {
    code: 'BHD',
    countryCode: 'BH',
    countryName: 'Bahrain',
    symbol: 'BD',
    symbolPrefix: true,
    spaceAfterSymbol: true,
    decimals: 1,
    exchangeMultiplier: 0.008,
    flag: '🇧🇭'
  },
  USD: {
    code: 'USD',
    countryCode: 'US',
    countryName: 'United States',
    symbol: '$',
    symbolPrefix: true,
    spaceAfterSymbol: false,
    decimals: 0,
    exchangeMultiplier: 0.024,
    flag: '🇺🇸'
  },
  GBP: {
    code: 'GBP',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    symbol: '£',
    symbolPrefix: true,
    spaceAfterSymbol: false,
    decimals: 0,
    exchangeMultiplier: 0.020,
    flag: '🇬🇧'
  },
  CAD: {
    code: 'CAD',
    countryCode: 'CA',
    countryName: 'Canada',
    symbol: 'C$',
    symbolPrefix: true,
    spaceAfterSymbol: false,
    decimals: 0,
    exchangeMultiplier: 0.032,
    flag: '🇨🇦'
  },
  AUD: {
    code: 'AUD',
    countryCode: 'AU',
    countryName: 'Australia',
    symbol: 'A$',
    symbolPrefix: true,
    spaceAfterSymbol: false,
    decimals: 0,
    exchangeMultiplier: 0.036,
    flag: '🇦🇺'
  },
  SGD: {
    code: 'SGD',
    countryCode: 'SG',
    countryName: 'Singapore',
    symbol: 'S$',
    symbolPrefix: true,
    spaceAfterSymbol: false,
    decimals: 0,
    exchangeMultiplier: 0.032,
    flag: '🇸🇬'
  },
  EUR: {
    code: 'EUR',
    countryCode: 'EU',
    countryName: 'Europe (Eurozone)',
    symbol: '€',
    symbolPrefix: true,
    spaceAfterSymbol: false,
    decimals: 0,
    exchangeMultiplier: 0.022,
    flag: '🇪🇺'
  },
  MYR: {
    code: 'MYR',
    countryCode: 'MY',
    countryName: 'Malaysia',
    symbol: 'RM',
    symbolPrefix: true,
    spaceAfterSymbol: true,
    decimals: 0,
    exchangeMultiplier: 0.11,
    flag: '🇲🇾'
  }
};

const EXACT_TIER_OVERRIDES = {
  100: {
    INR: 100, AED: 10, SAR: 10, QAR: 10, KWD: 1.0, OMR: 1.0, BHD: 1.0, USD: 3, GBP: 2.5, CAD: 4, AUD: 4.5, SGD: 4, EUR: 3, MYR: 12
  },
  300: {
    INR: 300, AED: 25, SAR: 25, QAR: 25, KWD: 2.0, OMR: 2.5, BHD: 2.5, USD: 8, GBP: 6, CAD: 11, AUD: 12, SGD: 11, EUR: 7, MYR: 35
  },
  500: {
    INR: 500, AED: 40, SAR: 40, QAR: 40, KWD: 3.5, OMR: 4.0, BHD: 4.0, USD: 12, GBP: 10, CAD: 16, AUD: 18, SGD: 16, EUR: 11, MYR: 55
  },
  800: {
    INR: 800, AED: 60, SAR: 60, QAR: 60, KWD: 5.0, OMR: 6.5, BHD: 6.5, USD: 18, GBP: 15, CAD: 25, AUD: 28, SGD: 25, EUR: 17, MYR: 90
  },
  1000: {
    INR: 1000, AED: 75, SAR: 75, QAR: 75, KWD: 6.5, OMR: 8.0, BHD: 8.0, USD: 22, GBP: 18, CAD: 30, AUD: 35, SGD: 32, EUR: 20, MYR: 110
  },
  1500: {
    INR: 1500, AED: 115, SAR: 115, QAR: 115, KWD: 10, OMR: 12, BHD: 12, USD: 35, GBP: 28, CAD: 48, AUD: 55, SGD: 48, EUR: 32, MYR: 165
  },
  3400: {
    INR: 3400, AED: 270, SAR: 270, QAR: 270, KWD: 24, OMR: 27, BHD: 27, USD: 82, GBP: 68, CAD: 110, AUD: 122, SGD: 110, EUR: 75, MYR: 375
  },
  4200: {
    INR: 4200, AED: 335, SAR: 335, QAR: 335, KWD: 30, OMR: 34, BHD: 34, USD: 100, GBP: 84, CAD: 135, AUD: 150, SGD: 135, EUR: 92, MYR: 460
  }
};

/**
 * Converts an INR amount to a target currency with clean psychological rounding.
 */
function convertInrToCurrency(inrAmount, targetCurrencyCode = 'INR') {
  if (!inrAmount || inrAmount <= 0) return 0;
  const currency = SUPPORTED_CURRENCIES[targetCurrencyCode] || SUPPORTED_CURRENCIES['INR'];
  if (currency.code === 'INR') return Math.round(inrAmount);

  // Exact tier check
  const roundedInr = Math.round(inrAmount);
  if (EXACT_TIER_OVERRIDES[roundedInr] && EXACT_TIER_OVERRIDES[roundedInr][currency.code] !== undefined) {
    return EXACT_TIER_OVERRIDES[roundedInr][currency.code];
  }

  const raw = inrAmount * currency.exchangeMultiplier;

  // Decimal currencies
  if (currency.code === 'KWD' || currency.code === 'OMR' || currency.code === 'BHD') {
    if (raw < 15) {
      return Math.round(raw * 2) / 2;
    }
    return Math.round(raw);
  }

  if (raw < 10) {
    return Math.round(raw * 2) / 2;
  }

  if (raw >= 100) {
    return Math.round(raw / 5) * 5;
  }

  return Math.round(raw);
}

/**
 * Formats a localized price string.
 */
function formatPrice(inrAmount, currencyCode = 'INR') {
  if (inrAmount === 0) return 'Free';
  const currency = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES['INR'];
  const converted = convertInrToCurrency(inrAmount, currencyCode);

  let numStr = currency.decimals > 0 && converted % 1 !== 0 
    ? converted.toFixed(1) 
    : converted.toLocaleString('en-US');

  if (currency.symbolPrefix) {
    return `${currency.symbol}${currency.spaceAfterSymbol ? ' ' : ''}${numStr}`;
  }
  return `${numStr}${currency.spaceAfterSymbol ? ' ' : ''}${currency.symbol}`;
}

/**
 * Validates that an amount claimed by a client matches the expected price.
 */
function validateOrderPrice(inrBaseAmount, currencyCode = 'INR', claimedAmount) {
  const expected = convertInrToCurrency(inrBaseAmount, currencyCode);
  // Allow a tiny tolerance for floating point difference if any (e.g. 0.5)
  return Math.abs(expected - claimedAmount) <= 1.0;
}

module.exports = {
  SUPPORTED_CURRENCIES,
  EXACT_TIER_OVERRIDES,
  convertInrToCurrency,
  formatPrice,
  validateOrderPrice
};

