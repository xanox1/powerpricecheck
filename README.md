# powerpricecheck

A JavaScript module for The Netherlands that provides information about current, past, and future energy prices based on EPEX spot market patterns and recommends the best time to run appliances to save money.

## Features

- 📊 **Current Price**: Get real-time energy pricing information
- 📈 **Past Prices**: Retrieve historical energy prices for analysis
- 🔮 **Future Prices**: View forecasted energy prices
- 💡 **Smart Recommendations**: Get optimal time slots to run appliances and maximize savings

## Installation

```bash
npm install powerpricecheck
```

Or clone the repository:

```bash
git clone https://github.com/xanox1/powerpricecheck.git
cd powerpricecheck
```

## Usage

```javascript
const {
  getCurrentPrice,
  getPastPrices,
  getFuturePrices,
  recommendBestTime
} = require('./powerpricecheck.js');

// Get current energy price
const current = getCurrentPrice();
console.log(`Current price: ${current.price} ${current.unit}`);

// Get past 24 hours of prices
const pastPrices = getPastPrices(24);
console.log(`Past prices:`, pastPrices);

// Get future 24 hours of prices
const futurePrices = getFuturePrices(24);
console.log(`Future prices:`, futurePrices);

// Get recommendation for running a 1-hour appliance
const recommendation = recommendBestTime(1, 24);
console.log(recommendation.message);
```

## API Reference

### getCurrentPrice()

Returns the current energy price.

**Returns:**
```javascript
{
  price: 11.23,           // Price in euro cents/kWh
  timestamp: "2026-01-01T19:00:00.000Z",
  hour: 19,               // Hour of day (0-23)
  unit: "€cents/kWh"
}
```

### getPastPrices(hours)

Retrieves historical energy prices.

**Parameters:**
- `hours` (number, optional): Number of hours to look back. Default: 24

**Returns:** Array of price objects
```javascript
[
  {
    price: 9.12,
    timestamp: "2026-01-01T18:00:00.000Z",
    hour: 18,
    unit: "€cents/kWh"
  },
  // ... more prices
]
```

### getFuturePrices(hours)

Retrieves forecasted energy prices.

**Parameters:**
- `hours` (number, optional): Number of hours to look ahead. Default: 24

**Returns:** Array of price objects (same format as getPastPrices)

### recommendBestTime(durationHours, lookAheadHours)

Recommends the optimal time to run an appliance based on energy prices.

**Parameters:**
- `durationHours` (number, optional): How long the appliance will run. Default: 1
- `lookAheadHours` (number, optional): How many hours ahead to check. Default: 24

**Returns:**
```javascript
{
  recommendation: {
    startTime: "2026-01-02T02:00:00.000Z",
    startHour: 2,
    endTime: "2026-01-02T02:00:00.000Z",
    endHour: 2,
    averagePrice: 7.15,
    prices: [/* array of prices for the time slot */]
  },
  currentPrice: 10.92,
  potentialSavings: 3.77,
  savingsPercentage: 34.5,
  unit: "€cents/kWh",
  durationHours: 1,
  message: "Wait until 2:00:00 AM to save 3.77 €cents/kWh (34.5%)"
}
```

## Example Scenarios

### Dishwasher (1 hour)
```javascript
const recommendation = recommendBestTime(1, 24);
console.log(recommendation.message);
// "Wait until 2:00 AM to save 3.77 €cents/kWh (34.5%)"
```

### Laundry Cycle (3 hours)
```javascript
const recommendation = recommendBestTime(3, 24);
console.log(recommendation.message);
// Shows best 3-hour window with average savings
```

### Electric Vehicle Charging (6 hours)
```javascript
const recommendation = recommendBestTime(6, 24);
console.log(recommendation.message);
// Finds the cheapest 6-hour window in the next 24 hours
```

## Running Tests

```bash
npm test
```

## Running Examples

```bash
node example.js
```

## How It Works

The module simulates energy pricing data based on actual Dutch EPEX spot market patterns:

- **Night Hours (0-6)**: Lowest prices due to low demand (~6-8 euro cents/kWh)
- **Morning Ramp (7-8)**: Prices start rising (~8-9 euro cents/kWh)
- **Day Hours (9-16)**: Moderate prices (~8.5-10 euro cents/kWh)
- **Evening Peak (17-21)**: Highest prices due to high demand (~10-12 euro cents/kWh)
- **Late Evening (22-23)**: Prices dropping (~7-9 euro cents/kWh)

The pricing model is based on typical Netherlands day-ahead market pricing patterns from the EPEX spot market, where prices are determined hourly based on supply and demand. The `recommendBestTime()` function analyzes price forecasts to find the optimal time slot with the lowest average price for your appliance duration, helping you maximize energy cost savings.

## About Dutch Energy Prices

This module is based on the Dutch EPEX spot market (day-ahead market) pricing structure, where:
- Prices are set through a daily auction for each hour of the following day
- Typical range: €0.07-0.12 per kWh (7-12 euro cents/kWh)
- Average daily price: ~€0.0875/kWh (8.75 euro cents/kWh)
- Lowest prices typically occur late night/early morning (after midnight)
- Highest prices occur during evening peak hours (17:00-21:00)
- Prices reflect renewable energy generation (wind/solar) and demand patterns

## Future Enhancements

- Integration with real Dutch energy price APIs (EPEX SPOT, dayahead.nl, etc.)
- Real-time data fetching from ENTSO-E Transparency Platform
- Support for multiple regions and time zones
- Historical price analytics and trends
- Carbon intensity tracking based on Dutch energy mix
- Smart home device integration
- Support for dynamic energy contracts

## License

MIT
