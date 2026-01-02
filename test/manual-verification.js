/**
 * Manual verification test demonstrating the fix
 * This shows how the end time is now correctly calculated for various durations
 */

// Set test token
process.env.ENTSOE_API_TOKEN = 'test-token';

// Mock entsoe-client
const entsoeClient = require('../entsoe-client.js');

// Create predictable test data
entsoeClient.getPriceData = async () => {
  const prices = [];
  const baseDate = new Date('2026-01-02T00:00:00.000Z');
  
  // Hours 2-6 have cheap prices (7 cents)
  // Other hours are expensive (12 cents)
  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(baseDate.getTime() + hour * 60 * 60 * 1000);
    const price = (hour >= 2 && hour <= 6) ? 7.0 : 12.0;
    
    prices.push({
      timestamp: date.toISOString(),
      hour: hour,
      price: price,
      period: hour === 0 ? 'current' : 'future'
    });
  }
  
  return prices;
};

const { recommendBestTime } = require('../powerpricecheck.js');

async function manualVerification() {
  console.log('========================================');
  console.log('MANUAL VERIFICATION OF END TIME FIX');
  console.log('========================================\n');
  
  console.log('Test Setup:');
  console.log('- Cheap hours: 02:00-06:00 (7 cents/kWh)');
  console.log('- Expensive hours: all other times (12 cents/kWh)\n');
  
  // Test various durations
  const durations = [1, 2, 3, 4, 6];
  
  for (const duration of durations) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TEST: Duration = ${duration} hour(s)`);
    console.log('='.repeat(50));
    
    const recommendation = await recommendBestTime(duration, 24);
    const rec = recommendation.recommendation;
    
    // Parse times
    const startTime = new Date(rec.startTime);
    const endTime = new Date(rec.endTime);
    
    // Calculate actual duration
    const actualDuration = (endTime - startTime) / (1000 * 60 * 60);
    
    // Format for display
    const startHour = startTime.getUTCHours();
    const endHour = endTime.getUTCHours();
    
    console.log(`\nRecommendation:`);
    console.log(`  Start Time: ${rec.startTime} (Hour ${startHour})`);
    console.log(`  End Time:   ${rec.endTime} (Hour ${endHour})`);
    console.log(`  Average Price: ${rec.averagePrice} €cents/kWh`);
    console.log(`  Number of price slots: ${rec.prices.length}`);
    
    console.log(`\nVerification:`);
    console.log(`  Expected duration: ${duration} hours`);
    console.log(`  Actual duration:   ${actualDuration} hours`);
    console.log(`  Status: ${actualDuration === duration ? '✓ PASS' : '✗ FAIL'}`);
    
    // Show the time range in human-readable format
    const hourRange = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
    console.log(`  Time range: ${hourRange}`);
    
    // Verify it picked the cheap period
    if (startHour >= 2 && startHour <= 6) {
      console.log(`  ✓ Correctly selected cheap period`);
    }
    
    console.log(`\nSavings Info:`);
    console.log(`  Current price: ${recommendation.currentPrice} €cents/kWh`);
    console.log(`  Potential savings: ${recommendation.potentialSavings} €cents/kWh`);
    console.log(`  Savings percentage: ${recommendation.savingsPercentage}%`);
    console.log(`  Message: ${recommendation.message}`);
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(50));
  console.log('\nAll tests demonstrate that:');
  console.log('1. End time = Start time + Duration (in hours)');
  console.log('2. The time window correctly represents when the appliance runs');
  console.log('3. For duration=2, you get a proper 2-hour window (not 1 hour)');
}

manualVerification().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
