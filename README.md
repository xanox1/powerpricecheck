# powerpricecheck

A JavaScript module that provides information about current, past, and future energy prices and recommends the best time to run appliances to save money.

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
  price: 18.45,           // Price in cents/kWh
  timestamp: "2026-01-01T19:00:00.000Z",
  hour: 19,               // Hour of day (0-23)
  unit: "cents/kWh"
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
    price: 12.34,
    timestamp: "2026-01-01T18:00:00.000Z",
    hour: 18,
    unit: "cents/kWh"
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
    averagePrice: 8.32,
    prices: [/* array of prices for the time slot */]
  },
  currentPrice: 19.81,
  potentialSavings: 11.49,
  savingsPercentage: 58,
  unit: "cents/kWh",
  durationHours: 1,
  message: "Wait until 2:00:00 AM to save 11.49 cents/kWh (58%)"
}
```

## Example Scenarios

### Dishwasher (1 hour)
```javascript
const recommendation = recommendBestTime(1, 24);
console.log(recommendation.message);
// "Wait until 2:00 AM to save 11.49 cents/kWh (58%)"
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

The module simulates energy pricing data based on typical time-of-use patterns:

- **Off-Peak Hours (10 PM - 6 AM)**: Lower prices (~8-10 cents/kWh)
- **Peak Hours (9-11 AM, 5-9 PM)**: Higher prices (~18-20 cents/kWh)
- **Mid-Peak Hours**: Medium prices (~12-14 cents/kWh)

The `recommendBestTime()` function analyzes price forecasts to find the optimal time slot with the lowest average price for your appliance duration, helping you maximize energy cost savings.

## Future Enhancements

- Integration with real energy price APIs
- Support for multiple regions and time zones
- Historical price analytics and trends
- Carbon intensity tracking
- Smart home device integration

## License

MIT
