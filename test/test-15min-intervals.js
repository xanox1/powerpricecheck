/**
 * Test to verify 15-minute interval data handling
 * This simulates what the node-red function does
 */

// Simulate the price aggregation logic from node-red-function.js
function aggregateTo15MinutesToHourly(prices) {
    const pricesByHour = new Map();
    prices.forEach(p => {
        const timestamp = new Date(p.timestamp);
        timestamp.setMinutes(0, 0, 0); // Round down to hour
        const hourKey = timestamp.toISOString();
        
        if (!pricesByHour.has(hourKey)) {
            pricesByHour.set(hourKey, []);
        }
        pricesByHour.get(hourKey).push(p.price);
    });
    
    // Convert to hourly averages
    const hourlyPrices = Array.from(pricesByHour.entries())
        .map(([timestamp, pricesInHour]) => ({
            timestamp,
            price: Math.round((pricesInHour.reduce((sum, p) => sum + p, 0) / pricesInHour.length) * 100) / 100,
            unit: "€cents/kWh"
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return hourlyPrices;
}

// Simulate 15-minute interval data from ENTSO-E (example from the issue)
// Web interface shows: 84.34, 82.79, 79.37, 77.10 EUR/MWh for first hour
// These should convert to: 8.434, 8.279, 7.937, 7.71 €cents/kWh
// Average for hour 00:00-01:00: (8.434 + 8.279 + 7.937 + 7.71) / 4 = 8.09 €cents/kWh

const test15MinData = [
    { timestamp: "2026-01-03T00:00:00.000Z", price: 8.43, unit: "€cents/kWh" },
    { timestamp: "2026-01-03T00:15:00.000Z", price: 8.28, unit: "€cents/kWh" },
    { timestamp: "2026-01-03T00:30:00.000Z", price: 7.94, unit: "€cents/kWh" },
    { timestamp: "2026-01-03T00:45:00.000Z", price: 7.71, unit: "€cents/kWh" },
    { timestamp: "2026-01-03T01:00:00.000Z", price: 8.09, unit: "€cents/kWh" },
    { timestamp: "2026-01-03T01:15:00.000Z", price: 7.8, unit: "€cents/kWh" },
    { timestamp: "2026-01-03T01:30:00.000Z", price: 7.76, unit: "€cents/kWh" },
    { timestamp: "2026-01-03T01:45:00.000Z", price: 7.7, unit: "€cents/kWh" },
];

console.log("Testing 15-minute interval aggregation...\n");
console.log("Input data (15-minute intervals):");
test15MinData.forEach(p => {
    console.log(`  ${p.timestamp}: ${p.price} ${p.unit}`);
});

const hourlyAggregated = aggregateTo15MinutesToHourly(test15MinData);

console.log("\nAggregated hourly data:");
hourlyAggregated.forEach(p => {
    console.log(`  ${p.timestamp}: ${p.price} ${p.unit}`);
});

// Test current price lookup
const now = new Date("2026-01-03T00:30:00.000Z");
const currentHourStart = new Date(now);
currentHourStart.setMinutes(0, 0, 0);
const currentHourKey = currentHourStart.toISOString();

const currentHourPrice = hourlyAggregated.find(p => p.timestamp === currentHourKey);

console.log("\nCurrent price lookup test:");
console.log(`  Current time: ${now.toISOString()}`);
console.log(`  Current hour key: ${currentHourKey}`);
console.log(`  Found current price: ${currentHourPrice ? currentHourPrice.price + ' ' + currentHourPrice.unit : 'NOT FOUND'}`);

// Verify results
if (hourlyAggregated.length === 2) {
    console.log("\n✓ Test PASSED: Correctly aggregated to 2 hourly entries");
} else {
    console.log(`\n✗ Test FAILED: Expected 2 hourly entries, got ${hourlyAggregated.length}`);
}

if (currentHourPrice) {
    console.log("✓ Test PASSED: Successfully found current hour price");
} else {
    console.log("✗ Test FAILED: Could not find current hour price");
}

// Expected average for first hour: (8.43 + 8.28 + 7.94 + 7.71) / 4 = 8.09
const expectedAvg = 8.09;
const firstHourAvg = hourlyAggregated[0].price;
if (Math.abs(firstHourAvg - expectedAvg) < 0.01) {
    console.log(`✓ Test PASSED: First hour average is correct (${firstHourAvg})`);
} else {
    console.log(`✗ Test FAILED: First hour average incorrect (expected ${expectedAvg}, got ${firstHourAvg})`);
}
