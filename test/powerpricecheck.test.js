/**
 * Test suite for PowerPriceCheck module
 */

const {
  getCurrentPrice,
  getPastPrices,
  getFuturePrices,
  recommendBestTime
} = require('../powerpricecheck.js');

let testsPassed = 0;
let testsFailed = 0;

const assert = (condition, testName) => {
  if (condition) {
    console.log(`✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`✗ ${testName}`);
    testsFailed++;
  }
};

const assertExists = (value, testName) => {
  assert(value !== undefined && value !== null, testName);
};

const assertType = (value, type, testName) => {
  assert(typeof value === type, testName);
};

const assertArray = (value, testName) => {
  assert(Array.isArray(value), testName);
};

console.log('Running PowerPriceCheck tests...\n');

// Test getCurrentPrice
console.log('Testing getCurrentPrice()...');
const currentPrice = getCurrentPrice();
assertExists(currentPrice, 'getCurrentPrice() returns a value');
assertExists(currentPrice.price, 'Current price has price property');
assertType(currentPrice.price, 'number', 'Current price is a number');
assertExists(currentPrice.timestamp, 'Current price has timestamp');
assertExists(currentPrice.hour, 'Current price has hour');
assert(currentPrice.hour >= 0 && currentPrice.hour <= 23, 'Hour is valid (0-23)');
assert(currentPrice.unit === '€cents/kWh', 'Unit is €cents/kWh');
console.log(`  Current price: ${currentPrice.price} ${currentPrice.unit} at hour ${currentPrice.hour}`);

// Test getPastPrices
console.log('\nTesting getPastPrices()...');
const pastPrices24 = getPastPrices();
assertArray(pastPrices24, 'getPastPrices() returns an array');
assert(pastPrices24.length === 24, 'Default returns 24 hours of past data');
assert(pastPrices24.every(p => p.price !== undefined), 'All past prices have price property');
assert(pastPrices24.every(p => typeof p.price === 'number'), 'All past prices are numbers');
assert(pastPrices24.every(p => p.timestamp !== undefined), 'All past prices have timestamp');
assert(pastPrices24.every(p => p.hour >= 0 && p.hour <= 23), 'All hours are valid');

const pastPrices12 = getPastPrices(12);
assert(pastPrices12.length === 12, 'getPastPrices(12) returns 12 hours of data');
console.log(`  Retrieved ${pastPrices24.length} past prices (24h) and ${pastPrices12.length} (12h)`);

// Test getFuturePrices
console.log('\nTesting getFuturePrices()...');
const futurePrices24 = getFuturePrices();
assertArray(futurePrices24, 'getFuturePrices() returns an array');
assert(futurePrices24.length === 24, 'Default returns 24 hours of future data');
assert(futurePrices24.every(p => p.price !== undefined), 'All future prices have price property');
assert(futurePrices24.every(p => typeof p.price === 'number'), 'All future prices are numbers');
assert(futurePrices24.every(p => p.timestamp !== undefined), 'All future prices have timestamp');
assert(futurePrices24.every(p => p.hour >= 0 && p.hour <= 23), 'All hours are valid');

const futurePrices6 = getFuturePrices(6);
assert(futurePrices6.length === 6, 'getFuturePrices(6) returns 6 hours of data');
console.log(`  Retrieved ${futurePrices24.length} future prices (24h) and ${futurePrices6.length} (6h)`);

// Test recommendBestTime
console.log('\nTesting recommendBestTime()...');
const recommendation1h = recommendBestTime();
assertExists(recommendation1h, 'recommendBestTime() returns a value');
assertExists(recommendation1h.recommendation, 'Has recommendation property');
assertExists(recommendation1h.currentPrice, 'Has current price');
assertExists(recommendation1h.potentialSavings, 'Has potential savings');
assertExists(recommendation1h.message, 'Has message');
assert(recommendation1h.durationHours === 1, 'Default duration is 1 hour');

const rec = recommendation1h.recommendation;
assertExists(rec.startTime, 'Recommendation has start time');
assertExists(rec.endTime, 'Recommendation has end time');
assertExists(rec.averagePrice, 'Recommendation has average price');
assertType(rec.averagePrice, 'number', 'Average price is a number');
assertArray(rec.prices, 'Recommendation has prices array');

console.log(`  Best time: Hour ${rec.startHour} (avg: ${rec.averagePrice} cents/kWh)`);
console.log(`  Potential savings: ${recommendation1h.potentialSavings} cents/kWh (${recommendation1h.savingsPercentage}%)`);
console.log(`  Message: ${recommendation1h.message}`);

const recommendation3h = recommendBestTime(3, 24);
assert(recommendation3h.durationHours === 3, 'Can specify duration of 3 hours');
assert(recommendation3h.recommendation.prices.length === 3, 'Recommendation includes 3 hours of prices');
console.log(`  3-hour recommendation: Start at hour ${recommendation3h.recommendation.startHour}, avg ${recommendation3h.recommendation.averagePrice} cents/kWh`);

// Test with limited lookahead
const recommendationLimited = recommendBestTime(1, 6);
assertExists(recommendationLimited.recommendation, 'Works with limited lookahead');
console.log(`  Limited 6h lookahead: Best at hour ${recommendationLimited.recommendation.startHour}`);

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
