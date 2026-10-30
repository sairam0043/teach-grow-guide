const { SUPPORTED_CURRENCIES, convertInrToCurrency, formatPrice, validateOrderPrice } = require('../utils/pricingService');

console.log('=== Step 1: Testing Conversion Matrix Baseline Tiers ===\n');

const testMatrix = [
  { inr: 100, expected: { INR: 100, AED: 10, USD: 3, GBP: 2.5, EUR: 3, KWD: 1.0, SAR: 10 } },
  { inr: 300, expected: { INR: 300, AED: 25, USD: 8, GBP: 6, EUR: 7, KWD: 2.0, SAR: 25 } },
  { inr: 500, expected: { INR: 500, AED: 40, USD: 12, GBP: 10, EUR: 11, KWD: 3.5, SAR: 40, CAD: 16, AUD: 18, SGD: 16, MYR: 55 } },
  { inr: 800, expected: { INR: 800, AED: 60, USD: 18, GBP: 15, EUR: 17, KWD: 5.0, SAR: 60 } },
  { inr: 1000, expected: { INR: 1000, AED: 75, USD: 22, GBP: 18, EUR: 20, KWD: 6.5, SAR: 75 } },
  { inr: 1500, expected: { INR: 1500, AED: 115, USD: 35, GBP: 28, EUR: 32, KWD: 10, SAR: 115 } },
  { inr: 3400, expected: { INR: 3400, AED: 270, USD: 82, GBP: 68, EUR: 75, KWD: 24, SAR: 270 } },
  { inr: 4200, expected: { INR: 4200, AED: 335, USD: 100, GBP: 84, EUR: 92, KWD: 30, SAR: 335 } }
];

let failed = 0;

for (const row of testMatrix) {
  for (const [currency, expectedVal] of Object.entries(row.expected)) {
    const actualVal = convertInrToCurrency(row.inr, currency);
    const formatted = formatPrice(row.inr, currency);
    if (actualVal !== expectedVal) {
      console.error(`❌ FAIL: ₹${row.inr} -> ${currency}: expected ${expectedVal}, got ${actualVal}`);
      failed++;
    } else {
      console.log(`✅ PASS: ₹${row.inr} -> ${currency}: ${actualVal} (formatted: "${formatted}")`);
    }
  }
}

console.log('\n=== Step 2: Testing Arbitrary Custom Tutor Rates ===\n');

const customRates = [450, 650, 750, 1200, 2000];
for (const inr of customRates) {
  console.log(`Tutor rate ₹${inr}/hr:`);
  for (const curr of ['AED', 'USD', 'GBP', 'SAR', 'EUR', 'KWD']) {
    const converted = convertInrToCurrency(inr, curr);
    const formatted = formatPrice(inr, curr);
    console.log(`   ${curr}: ${converted} (${formatted})`);
  }
}

console.log('\n=== Step 3: Testing Order Price Validation ===\n');

const validTest1 = validateOrderPrice(500, 'AED', 40);
const validTest2 = validateOrderPrice(500, 'USD', 12);
const invalidTest = validateOrderPrice(500, 'AED', 10); // Fraudulent claim

if (validTest1 && validTest2 && !invalidTest) {
  console.log('✅ PASS: Order price validation correctly verifies valid prices and flags tampering.');
} else {
  console.error('❌ FAIL: Order price validation check failed.');
  failed++;
}

if (failed === 0) {
  console.log('\n🎉 ALL LOCALIZATION AND PRICING TESTS PASSED PERFECTLY!');
} else {
  console.error(`\n⚠️ ${failed} test(s) failed.`);
  process.exit(1);
}

