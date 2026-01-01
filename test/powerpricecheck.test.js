/**
 * Test suite for PowerPriceCheck module
 */

// Set a test token before requiring the module
process.env.ENTSOE_API_TOKEN = 'test-token-for-testing';

// Mock the entsoe-client module
const entsoeClient = require('../entsoe-client.js');

// Create mock data generator
const generateMockPriceData = () => {
  const prices = [];
  const now = new Date();
  
  for (let hourOffset = -24; hourOffset <= 24; hourOffset++) {
    const date = new Date(now.getTime() + hourOffset * 60 * 60 * 1000);
    const hour = date.getHours();
    
    // Simple price pattern for testing
    let basePrice;
    if (hour >= 0 && hour <= 6) {
      basePrice = 7.0;
    } else if (hour >= 7 && hour <= 8) {
      basePrice = 8.5;
    } else if (hour >= 9 && hour <= 16) {
      basePrice = 9.0;
    } else if (hour >= 17 && hour <= 21) {
      basePrice = 11.0;
    } else {
      basePrice = 8.0;
    }
    
    const price = basePrice + (Math.random() - 0.5);
    
    prices.push({
      timestamp: date.toISOString(),
      hour: date.getHours(),
      price: Math.round(price * 100) / 100,
      period: hourOffset < 0 ? 'past' : hourOffset === 0 ? 'current' : 'future'
    });
  }
  
  return prices;
};

// Store original function for cleanup
const originalGetPriceData = entsoeClient.getPriceData;

// Mock the getPriceData function
entsoeClient.getPriceData = async () => {
  return generateMockPriceData();
};

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

// Main test runner
async function runTests() {
  console.log('Running PowerPriceCheck tests...\n');

  // Test getCurrentPrice
  console.log('Testing getCurrentPrice()...');
  const currentPrice = await getCurrentPrice();
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
  const pastPrices24 = await getPastPrices();
  assertArray(pastPrices24, 'getPastPrices() returns an array');
  assert(pastPrices24.length === 24, 'Default returns 24 hours of past data');
  assert(pastPrices24.every(p => p.price !== undefined), 'All past prices have price property');
  assert(pastPrices24.every(p => typeof p.price === 'number'), 'All past prices are numbers');
  assert(pastPrices24.every(p => p.timestamp !== undefined), 'All past prices have timestamp');
  assert(pastPrices24.every(p => p.hour >= 0 && p.hour <= 23), 'All hours are valid');

  const pastPrices12 = await getPastPrices(12);
  assert(pastPrices12.length === 12, 'getPastPrices(12) returns 12 hours of data');
  console.log(`  Retrieved ${pastPrices24.length} past prices (24h) and ${pastPrices12.length} (12h)`);

  // Test getFuturePrices
  console.log('\nTesting getFuturePrices()...');
  const futurePrices24 = await getFuturePrices();
  assertArray(futurePrices24, 'getFuturePrices() returns an array');
  assert(futurePrices24.length === 24, 'Default returns 24 hours of future data');
  assert(futurePrices24.every(p => p.price !== undefined), 'All future prices have price property');
  assert(futurePrices24.every(p => typeof p.price === 'number'), 'All future prices are numbers');
  assert(futurePrices24.every(p => p.timestamp !== undefined), 'All future prices have timestamp');
  assert(futurePrices24.every(p => p.hour >= 0 && p.hour <= 23), 'All hours are valid');

  const futurePrices6 = await getFuturePrices(6);
  assert(futurePrices6.length === 6, 'getFuturePrices(6) returns 6 hours of data');
  console.log(`  Retrieved ${futurePrices24.length} future prices (24h) and ${futurePrices6.length} (6h)`);

  // Test recommendBestTime
  console.log('\nTesting recommendBestTime()...');
  const recommendation1h = await recommendBestTime();
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

  const recommendation3h = await recommendBestTime(3, 24);
  assert(recommendation3h.durationHours === 3, 'Can specify duration of 3 hours');
  assert(recommendation3h.recommendation.prices.length === 3, 'Recommendation includes 3 hours of prices');
  console.log(`  3-hour recommendation: Start at hour ${recommendation3h.recommendation.startHour}, avg ${recommendation3h.recommendation.averagePrice} cents/kWh`);

  // Test with limited lookahead
  const recommendationLimited = await recommendBestTime(1, 6);
  assertExists(recommendationLimited.recommendation, 'Works with limited lookahead');
  console.log(`  Limited 6h lookahead: Best at hour ${recommendationLimited.recommendation.startHour}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log('='.repeat(50));

  // Cleanup: restore original function
  entsoeClient.getPriceData = originalGetPriceData;

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
