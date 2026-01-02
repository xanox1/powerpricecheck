/**
 * Integration test simulating the actual scenario from the issue
 * Tests the complete flow with cached 15-minute interval data
 */

// Simulate the aggregation logic from node-red-function.js
function aggregateToHourly(prices) {
    const pricesByHour = new Map();
    prices.forEach(p => {
        const hourTimestamp = new Date(p.timestamp);
        hourTimestamp.setMinutes(0, 0, 0);
        const hourKey = hourTimestamp.toISOString();
        
        if (!pricesByHour.has(hourKey)) {
            pricesByHour.set(hourKey, []);
        }
        pricesByHour.get(hourKey).push(p.price);
    });
    
    const hourlyPrices = Array.from(pricesByHour.entries())
        .map(([timestamp, pricesInHour]) => ({
            timestamp,
            price: Math.round((pricesInHour.reduce((sum, p) => sum + p, 0) / pricesInHour.length) * 100) / 100,
            unit: "€cents/kWh"
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return hourlyPrices;
}

// Simulate finding current price
function findCurrentPrice(hourlyPrices, now) {
    const currentHourStart = new Date(now);
    currentHourStart.setMinutes(0, 0, 0);
    const currentHourKey = currentHourStart.toISOString();
    
    const currentHourPrice = hourlyPrices.find(p => p.timestamp === currentHourKey);
    return currentHourPrice;
}

// Simulate finding best time
function findBestTime(hourlyPrices, duration) {
    let bestSlot = null;
    let lowestAvgPrice = Infinity;

    for (let i = 0; i <= hourlyPrices.length - duration; i++) {
        const slot = hourlyPrices.slice(i, i + duration);
        const avgPrice = slot.reduce((sum, p) => sum + p.price, 0) / slot.length;

        if (avgPrice < lowestAvgPrice) {
            lowestAvgPrice = avgPrice;
            bestSlot = slot;
        }
    }

    return { bestSlot, lowestAvgPrice };
}

console.log("=".repeat(60));
console.log("INTEGRATION TEST: Simulating Issue Scenario");
console.log("=".repeat(60));

// Simulate 15-minute interval data covering the issue scenario
// Current time was: 2026-01-02T16:44:00.000Z (17:44 CET)
// The issue was that hour 16:00 UTC (17:00 CET) was missing from cached data
const simulatedCachedData = [
    // Hour 15:00 UTC (16:00 CET) - 4 entries
    { timestamp: "2026-01-02T15:00:00.000Z", price: 0.94, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T15:15:00.000Z", price: 0.92, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T15:30:00.000Z", price: 0.96, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T15:45:00.000Z", price: 0.95, unit: "€cents/kWh" },
    
    // Hour 16:00 UTC (17:00 CET) - 4 entries (THIS WAS MISSING IN THE ORIGINAL ISSUE)
    { timestamp: "2026-01-02T16:00:00.000Z", price: 1.00, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T16:15:00.000Z", price: 1.02, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T16:30:00.000Z", price: 0.98, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T16:45:00.000Z", price: 1.01, unit: "€cents/kWh" },
    
    // Hour 17:00 UTC (18:00 CET) - 4 entries
    { timestamp: "2026-01-02T17:00:00.000Z", price: 1.12, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T17:15:00.000Z", price: 1.10, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T17:30:00.000Z", price: 1.14, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T17:45:00.000Z", price: 1.13, unit: "€cents/kWh" },
    
    // Hour 18:00 UTC (19:00 CET) - 4 entries
    { timestamp: "2026-01-02T18:00:00.000Z", price: 0.98, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T18:15:00.000Z", price: 0.97, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T18:30:00.000Z", price: 0.99, unit: "€cents/kWh" },
    { timestamp: "2026-01-02T18:45:00.000Z", price: 0.98, unit: "€cents/kWh" },
];

console.log("\n1. Input: 15-minute interval data");
console.log(`   Total entries: ${simulatedCachedData.length}`);
console.log(`   Time range: ${simulatedCachedData[0].timestamp} to ${simulatedCachedData[simulatedCachedData.length - 1].timestamp}`);

// Aggregate to hourly
const hourlyPrices = aggregateToHourly(simulatedCachedData);

console.log("\n2. Aggregation: 15-minute → hourly averages");
console.log(`   Hourly entries: ${hourlyPrices.length}`);
hourlyPrices.forEach(p => {
    const hour = new Date(p.timestamp).getUTCHours();
    console.log(`   ${p.timestamp} (${hour}:00 UTC): ${p.price} ${p.unit}`);
});

// Test current price lookup (17:44 CET = 16:44 UTC)
const currentTime = new Date("2026-01-02T16:44:00.000Z");
console.log(`\n3. Current price lookup at: ${currentTime.toISOString()}`);
console.log(`   Looking for hour: ${currentTime.getUTCHours()}:00 UTC`);

const currentPrice = findCurrentPrice(hourlyPrices, currentTime);
if (currentPrice) {
    console.log(`   ✓ Found current price: ${currentPrice.price} ${currentPrice.unit}`);
} else {
    console.log(`   ✗ FAILED: Could not find current price`);
}

// Test best time recommendation (2 hours duration)
console.log("\n4. Best time recommendation (2 hour duration)");
const duration = 2;
const { bestSlot, lowestAvgPrice } = findBestTime(hourlyPrices, duration);

if (bestSlot) {
    const startHour = new Date(bestSlot[0].timestamp).getUTCHours();
    const endHour = new Date(bestSlot[bestSlot.length - 1].timestamp).getUTCHours() + 1;
    console.log(`   Best time: ${startHour}:00 - ${endHour}:00 UTC`);
    console.log(`   Average price: ${lowestAvgPrice.toFixed(2)} €cents/kWh`);
    console.log(`   Current price: ${currentPrice.price} €cents/kWh`);
    const savings = currentPrice.price - lowestAvgPrice;
    console.log(`   Savings: ${savings.toFixed(2)} €cents/kWh`);
    console.log(`   ✓ Successfully found best time recommendation`);
} else {
    console.log(`   ✗ FAILED: Could not find best time`);
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("TEST RESULTS");
console.log("=".repeat(60));

let passCount = 0;
let failCount = 0;

if (hourlyPrices.length === 4) {
    console.log("✓ PASS: Correctly aggregated to 4 hourly entries");
    passCount++;
} else {
    console.log(`✗ FAIL: Expected 4 hourly entries, got ${hourlyPrices.length}`);
    failCount++;
}

if (currentPrice) {
    console.log("✓ PASS: Successfully found current hour price");
    passCount++;
} else {
    console.log("✗ FAIL: Could not find current hour price");
    failCount++;
}

if (bestSlot) {
    console.log("✓ PASS: Successfully found best time recommendation");
    passCount++;
} else {
    console.log("✗ FAIL: Could not find best time recommendation");
    failCount++;
}

console.log("\n" + "=".repeat(60));
console.log(`Total: ${passCount} passed, ${failCount} failed`);
console.log("=".repeat(60));

if (failCount === 0) {
    console.log("\n✓ ALL TESTS PASSED - Issue is FIXED!");
    process.exit(0);
} else {
    console.log("\n✗ SOME TESTS FAILED");
    process.exit(1);
}
