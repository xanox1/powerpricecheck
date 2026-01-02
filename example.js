/**
 * Example usage of PowerPriceCheck module
 * 
 * Before running this example, make sure you have set the ENTSOE_API_TOKEN environment variable:
 * export ENTSOE_API_TOKEN=your-api-token-here
 * 
 * Or create a .env file with:
 * ENTSOE_API_TOKEN=your-api-token-here
 */

const {
  getCurrentPrice,
  getPastPrices,
  getFuturePrices,
  recommendBestTime
} = require('./powerpricecheck.js');

async function runExamples() {
  console.log('='.repeat(60));
  console.log('PowerPriceCheck - Example Usage');
  console.log('='.repeat(60));

  // Example 1: Get current energy price
  console.log('\n1. Current Energy Price:');
  const current = await getCurrentPrice();
  console.log(`   Price: ${current.price} ${current.unit}`);
  console.log(`   Time: ${new Date(current.timestamp).toLocaleString()}`);
  console.log(`   Hour: ${current.hour}`);

  // Example 2: Get past 12 hours of prices
  console.log('\n2. Past 12 Hours of Prices:');
  const pastPrices = await getPastPrices(12);
  console.log(`   Retrieved ${pastPrices.length} historical data points`);
  console.log(`   Price range: ${Math.min(...pastPrices.map(p => p.price)).toFixed(2)} - ${Math.max(...pastPrices.map(p => p.price)).toFixed(2)} cents/kWh`);
  console.log(`   Average: ${(pastPrices.reduce((sum, p) => sum + p.price, 0) / pastPrices.length).toFixed(2)} cents/kWh`);

  // Example 3: Get future 24 hours of prices
  console.log('\n3. Future 24 Hours of Prices:');
  const futurePrices = await getFuturePrices(24);
  console.log(`   Retrieved ${futurePrices.length} forecast data points`);
  console.log(`   Price range: ${Math.min(...futurePrices.map(p => p.price)).toFixed(2)} - ${Math.max(...futurePrices.map(p => p.price)).toFixed(2)} cents/kWh`);
  console.log(`   Average: ${(futurePrices.reduce((sum, p) => sum + p.price, 0) / futurePrices.length).toFixed(2)} cents/kWh`);

  // Example 4: Recommend best time for 1-hour appliance
  console.log('\n4. Best Time for 1-Hour Appliance (e.g., dishwasher):');
  const rec1h = await recommendBestTime(1, 24);
  console.log(`   ${rec1h.message}`);
  console.log(`   Best time: ${new Date(rec1h.recommendation.startTime).toLocaleString()}`);
  console.log(`   Average price: ${rec1h.recommendation.averagePrice} ${rec1h.unit}`);
  console.log(`   Current price: ${rec1h.currentPrice} ${rec1h.unit}`);
  console.log(`   Savings: ${rec1h.potentialSavings} ${rec1h.unit} (${rec1h.savingsPercentage}%)`);

  // Example 5: Recommend best time for 3-hour appliance
  console.log('\n5. Best Time for 3-Hour Appliance (e.g., laundry cycle):');
  const rec3h = await recommendBestTime(3, 24);
  console.log(`   ${rec3h.message}`);
  console.log(`   Best time window: ${new Date(rec3h.recommendation.startTime).toLocaleString()}`);
  console.log(`   to ${new Date(rec3h.recommendation.endTime).toLocaleString()}`);
  console.log(`   Average price: ${rec3h.recommendation.averagePrice} ${rec3h.unit}`);
  console.log(`   Potential savings: ${rec3h.savingsPercentage}%`);

  // Example 6: Quick check for next 6 hours
  console.log('\n6. Quick Check - Next 6 Hours:');
  const rec6h = await recommendBestTime(1, 6);
  console.log(`   ${rec6h.message}`);
  console.log(`   Best hour in next 6 hours: Hour ${rec6h.recommendation.startHour}`);

  console.log('\n' + '='.repeat(60));
}

// Run examples
runExamples().catch(error => {
  console.error('Error running examples:', error);
  process.exit(1);
});
