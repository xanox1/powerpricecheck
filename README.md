# powerpricecheck

A JavaScript module for The Netherlands that provides information about current, past, and future energy prices from the ENTSO-E Transparency Platform and recommends the best time to run appliances to save money.

## Features

- 📊 **Real ENTSO-E Data**: Fetches actual day-ahead energy prices from the ENTSO-E Transparency Platform
- 🔄 **Automatic Fallback**: Uses simulated data based on typical Dutch EPEX patterns when API token is not configured
- 📈 **Past Prices**: Retrieve historical energy prices for analysis
- 🔮 **Future Prices**: View forecasted energy prices (day-ahead market)
- 💡 **Smart Recommendations**: Get optimal time slots to run appliances and maximize savings
- ⚡ **Caching**: Smart caching reduces API calls and improves performance

## Installation

```bash
npm install powerpricecheck
```

Or clone the repository:

```bash
git clone https://github.com/xanox1/powerpricecheck.git
cd powerpricecheck
```

## Configuration (Optional)

To use real ENTSO-E Transparency Platform data, you need an API token:

1. **Register** at [ENTSO-E Transparency Platform](https://transparency.entsoe.eu/)
2. **Request API access** by sending an email to `transparency@entsoe.eu`
3. **Generate your token** in Account Settings → Web API Security Token
4. **Set environment variable**:

```bash
export ENTSOE_API_TOKEN=your-api-token-here
```

Or create a `.env` file:
```bash
ENTSOE_API_TOKEN=your-api-token-here
```

**Note**: If no API token is configured, the module will automatically use simulated data based on typical Dutch EPEX spot market patterns.

## Usage

```javascript
const {
  getCurrentPrice,
  getPastPrices,
  getFuturePrices,
  recommendBestTime
} = require('./powerpricecheck.js');

// All functions now return Promises, so use async/await or .then()

// Get current energy price
const current = await getCurrentPrice();
console.log(`Current price: ${current.price} ${current.unit}`);

// Get past 24 hours of prices
const pastPrices = await getPastPrices(24);
console.log(`Past prices:`, pastPrices);

// Get future 24 hours of prices
const futurePrices = await getFuturePrices(24);
console.log(`Future prices:`, futurePrices);

// Get recommendation for running a 1-hour appliance
const recommendation = await recommendBestTime(1, 24);
console.log(recommendation.message);
```

## API Reference

### getCurrentPrice()

Returns the current energy price from ENTSO-E API or simulated data.

**Returns:** Promise<Object>
```javascript
{
  price: 11.23,           // Price in euro cents/kWh (converted from EUR/MWh)
  timestamp: "2026-01-01T19:00:00.000Z",
  hour: 19,               // Hour of day (0-23)
  unit: "€cents/kWh"
}
```

### getPastPrices(hours)

Retrieves historical energy prices.

**Parameters:**
- `hours` (number, optional): Number of hours to look back. Default: 24

**Returns:** Promise<Array> of price objects
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

Retrieves forecasted energy prices from ENTSO-E day-ahead market.

**Parameters:**
- `hours` (number, optional): Number of hours to look ahead. Default: 24

**Returns:** Promise<Array> of price objects (same format as getPastPrices)

### recommendBestTime(durationHours, lookAheadHours)

Recommends the optimal time to run an appliance based on energy prices.

**Parameters:**
- `durationHours` (number, optional): How long the appliance will run. Default: 1
- `lookAheadHours` (number, optional): How many hours ahead to check. Default: 24

**Returns:** Promise<Object>
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
const recommendation = await recommendBestTime(1, 24);
console.log(recommendation.message);
// "Wait until 2:00 AM to save 3.77 €cents/kWh (34.5%)"
```

### Laundry Cycle (3 hours)
```javascript
const recommendation = await recommendBestTime(3, 24);
console.log(recommendation.message);
// Shows best 3-hour window with average savings
```

### Electric Vehicle Charging (6 hours)
```javascript
const recommendation = await recommendBestTime(6, 24);
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

### Real Data Mode (with ENTSO-E API Token)

When an ENTSO-E API token is configured, the module:

1. **Fetches real prices** from the ENTSO-E Transparency Platform API
2. **Queries day-ahead market data** for the Netherlands (EIC code: 10YNL----------L)
3. **Converts prices** from EUR/MWh to euro cents/kWh (divides by 10)
4. **Caches data** for 1 hour to reduce API calls
5. **Handles errors gracefully** by falling back to simulated data if needed

### Simulated Data Mode (without API Token)

The module simulates energy pricing data based on actual Dutch EPEX spot market patterns:

- **Night Hours (0-6)**: Lowest prices due to low demand (~6-8 euro cents/kWh)
- **Morning Ramp (7-8)**: Prices start rising (~8-9 euro cents/kWh)
- **Day Hours (9-16)**: Moderate prices (~8.5-10 euro cents/kWh)
- **Evening Peak (17-21)**: Highest prices due to high demand (~10-12 euro cents/kWh)
- **Late Evening (22-23)**: Prices dropping (~7-9 euro cents/kWh)

The pricing model is based on typical Netherlands day-ahead market pricing patterns from the EPEX spot market, where prices are determined hourly based on supply and demand. The `recommendBestTime()` function analyzes price forecasts to find the optimal time slot with the lowest average price for your appliance duration, helping you maximize energy cost savings.

## About Dutch Energy Prices

This module uses the Dutch EPEX spot market (day-ahead market) pricing structure, where:
- Prices are set through a daily auction for each hour of the following day via ENTSO-E
- Typical range: €0.06-0.12 per kWh (6-12 euro cents/kWh)
- Average daily price: ~€0.0875/kWh (8.75 euro cents/kWh)
- Lowest prices typically occur late night/early morning (6-8 euro cents/kWh)
- Highest prices occur during evening peak hours 17:00-21:00 (10-12 euro cents/kWh)
- Prices reflect renewable energy generation (wind/solar) and demand patterns

## Technical Details

- **API**: ENTSO-E Transparency Platform REST API
- **Data Format**: XML (automatically parsed to JSON)
- **Price Unit**: Converted from EUR/MWh to euro cents/kWh
- **Update Frequency**: Day-ahead prices are typically published daily around 13:00 CET
- **Caching**: 1-hour cache to optimize API usage
- **Dependencies**: axios (HTTP client), xml2js (XML parser)

## Future Enhancements

- ✅ ~~Real-time data fetching from ENTSO-E Transparency Platform~~ **IMPLEMENTED**
- Support for multiple regions and time zones
- Historical price analytics and trends
- Carbon intensity tracking based on Dutch energy mix
- Smart home device integration
- Support for dynamic energy contracts
- WebSocket support for real-time price updates

## License

MIT
