/**
 * Test to verify the end time fix for recommendBestTime
 */

// Set a test token
process.env.ENTSOE_API_TOKEN = 'test-token-for-testing';

// Mock the entsoe-client module
const entsoeClient = require('../entsoe-client.js');

// Create simple mock data for predictable testing
const generateSimpleMockData = () => {
  const prices = [];
  const baseDate = new Date('2026-01-02T00:00:00.000Z');
  
  // Create 24 hours of price data with predictable pattern
  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(baseDate.getTime() + hour * 60 * 60 * 1000);
    // Hours 2-5 have lower prices
    const price = (hour >= 2 && hour <= 5) ? 7.0 : 10.0;
    
    prices.push({
      timestamp: date.toISOString(),
      hour: hour,
      price: price,
      period: hour === 0 ? 'current' : 'future'
    });
  }
  
  return prices;
};

// Mock the getPriceData function
entsoeClient.getPriceData = async () => {
  return generateSimpleMockData();
};

const { recommendBestTime } = require('../powerpricecheck.js');

async function testEndTime() {
  console.log('Testing end time calculation for different durations...\n');
  
  // Test 1: Duration of 1 hour
  console.log('Test 1: Duration = 1 hour');
  const rec1h = await recommendBestTime(1, 24);
  const start1 = new Date(rec1h.recommendation.startTime);
  const end1 = new Date(rec1h.recommendation.endTime);
  const duration1 = (end1 - start1) / (1000 * 60 * 60);
  console.log(`  Start: ${start1.toISOString()}`);
  console.log(`  End: ${end1.toISOString()}`);
  console.log(`  Duration: ${duration1} hours`);
  console.log(`  ✓ ${duration1 === 1 ? 'PASS' : 'FAIL'} - Duration should be 1 hour\n`);
  
  // Test 2: Duration of 2 hours
  console.log('Test 2: Duration = 2 hours');
  const rec2h = await recommendBestTime(2, 24);
  const start2 = new Date(rec2h.recommendation.startTime);
  const end2 = new Date(rec2h.recommendation.endTime);
  const duration2 = (end2 - start2) / (1000 * 60 * 60);
  console.log(`  Start: ${start2.toISOString()}`);
  console.log(`  End: ${end2.toISOString()}`);
  console.log(`  Duration: ${duration2} hours`);
  console.log(`  ✓ ${duration2 === 2 ? 'PASS' : 'FAIL'} - Duration should be 2 hours\n`);
  
  // Test 3: Duration of 3 hours
  console.log('Test 3: Duration = 3 hours');
  const rec3h = await recommendBestTime(3, 24);
  const start3 = new Date(rec3h.recommendation.startTime);
  const end3 = new Date(rec3h.recommendation.endTime);
  const duration3 = (end3 - start3) / (1000 * 60 * 60);
  console.log(`  Start: ${start3.toISOString()}`);
  console.log(`  End: ${end3.toISOString()}`);
  console.log(`  Duration: ${duration3} hours`);
  console.log(`  ✓ ${duration3 === 3 ? 'PASS' : 'FAIL'} - Duration should be 3 hours\n`);
  
  // Test 4: Duration of 6 hours
  console.log('Test 4: Duration = 6 hours');
  const rec6h = await recommendBestTime(6, 24);
  const start6 = new Date(rec6h.recommendation.startTime);
  const end6 = new Date(rec6h.recommendation.endTime);
  const duration6 = (end6 - start6) / (1000 * 60 * 60);
  console.log(`  Start: ${start6.toISOString()}`);
  console.log(`  End: ${end6.toISOString()}`);
  console.log(`  Duration: ${duration6} hours`);
  console.log(`  ✓ ${duration6 === 6 ? 'PASS' : 'FAIL'} - Duration should be 6 hours\n`);
  
  // Summary
  const allPass = duration1 === 1 && duration2 === 2 && duration3 === 3 && duration6 === 6;
  console.log('='.repeat(50));
  if (allPass) {
    console.log('✓ All end time tests PASSED!');
    process.exit(0);
  } else {
    console.log('✗ Some tests FAILED!');
    process.exit(1);
  }
}

testEndTime().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
