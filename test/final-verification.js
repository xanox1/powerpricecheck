/**
 * Final verification test that specifically addresses the problem statement
 * 
 * Problem Statement:
 * - Input: duration=2
 * - Buggy Output: "between 02:00 and 23:00" (21-hour window - WRONG!)
 * - Expected: Should show a proper 2-hour window
 */

console.log('='.repeat(70));
console.log('FINAL VERIFICATION - Problem Statement Test');
console.log('='.repeat(70));
console.log('\nProblem: With duration=2, output showed "between 02:00 and 23:00"');
console.log('Expected: Should show a proper 2-hour window like "02:00 and 04:00"\n');

// Set test token
process.env.ENTSOE_API_TOKEN = 'test-token';

// Mock entsoe-client
const entsoeClient = require('../entsoe-client.js');

// Create test data that would result in 02:00 being the best time
entsoeClient.getPriceData = async () => {
  const prices = [];
  const baseDate = new Date('2026-01-02T00:00:00.000Z');
  
  // Make hour 2 the cheapest to match problem statement
  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(baseDate.getTime() + hour * 60 * 60 * 1000);
    let price;
    if (hour === 2) {
      price = 7.0;  // Cheapest at 02:00
    } else if (hour === 3) {
      price = 7.5;  // Still cheap at 03:00
    } else {
      price = 12.0; // Expensive elsewhere
    }
    
    prices.push({
      timestamp: date.toISOString(),
      hour: hour,
      price: price,
      period: hour === 15 ? 'current' : 'future'  // Simulate being at hour 15 (3 PM)
    });
  }
  
  return prices;
};

const { recommendBestTime } = require('../powerpricecheck.js');

async function finalVerification() {
  console.log('Running test with duration=2...\n');
  
  const recommendation = await recommendBestTime(2, 24);
  const rec = recommendation.recommendation;
  
  // Parse the times
  const startTime = new Date(rec.startTime);
  const endTime = new Date(rec.endTime);
  const startHour = startTime.getUTCHours();
  const endHour = endTime.getUTCHours();
  
  // Calculate actual duration
  const actualDuration = (endTime - startTime) / (1000 * 60 * 60);
  
  console.log('Results:');
  console.log('-'.repeat(70));
  console.log(`Start Time: ${rec.startTime}`);
  console.log(`End Time:   ${rec.endTime}`);
  console.log(`Start Hour: ${startHour}:00`);
  console.log(`End Hour:   ${endHour}:00`);
  console.log(`Duration:   ${actualDuration} hours`);
  console.log('-'.repeat(70));
  
  // Verification checks
  console.log('\nVerification Checks:');
  console.log('-'.repeat(70));
  
  const checks = [
    {
      name: 'Start hour is 02:00 (cheapest time)',
      pass: startHour === 2,
      actual: `${startHour}:00`,
      expected: '02:00'
    },
    {
      name: 'End hour is 04:00 (not 23:00!)',
      pass: endHour === 4,
      actual: `${endHour}:00`,
      expected: '04:00'
    },
    {
      name: 'Duration is exactly 2 hours',
      pass: actualDuration === 2,
      actual: `${actualDuration} hours`,
      expected: '2 hours'
    },
    {
      name: 'Time window is reasonable (not 21 hours!)',
      pass: actualDuration <= 2,
      actual: `${actualDuration} hours`,
      expected: '≤ 2 hours'
    }
  ];
  
  let allPass = true;
  checks.forEach(check => {
    const status = check.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${check.name}`);
    console.log(`         Actual: ${check.actual}, Expected: ${check.expected}`);
    if (!check.pass) allPass = false;
  });
  
  console.log('-'.repeat(70));
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  if (allPass) {
    console.log('✓✓✓ SUCCESS! Problem is FIXED! ✓✓✓');
    console.log('='.repeat(70));
    console.log('\nBefore fix: "between 02:00 and 23:00" (21 hours - WRONG)');
    console.log(`After fix:  "between ${String(startHour).padStart(2,'0')}:00 and ${String(endHour).padStart(2,'0')}:00" (${actualDuration} hours - CORRECT)`);
    console.log('\nThe end time now correctly represents when the appliance finishes');
    console.log('running (start + duration), not just the last hour\'s start time.');
    process.exit(0);
  } else {
    console.log('✗✗✗ FAILURE! Problem still exists! ✗✗✗');
    console.log('='.repeat(70));
    process.exit(1);
  }
}

finalVerification().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
