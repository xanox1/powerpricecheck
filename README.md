# powerpricecheck

A JavaScript module for The Netherlands that provides real-time energy prices from the ENTSO-E Transparency Platform and recommends the best time to run appliances to save money.

## Features

- 📊 **Real ENTSO-E Data**: Fetches actual day-ahead energy prices from the ENTSO-E Transparency Platform
- 📈 **Past Prices**: Retrieve historical energy prices for analysis
- 🔮 **Future Prices**: View forecasted energy prices (day-ahead market)
- 💡 **Smart Recommendations**: Get optimal time slots to run appliances and maximize savings
- ⚡ **Caching**: Smart caching reduces API calls and improves performance
- 🔴 **Node-RED Support**: Ready-to-use function node code for Node-RED integration

## Installation

```bash
npm install powerpricecheck
```

Or clone the repository:

```bash
git clone https://github.com/xanox1/powerpricecheck.git
cd powerpricecheck
```

## Configuration (Required)

You need an ENTSO-E Transparency Platform API token to use this module:

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

**Note**: The API token is required for this module to work.

## Usage

### Standard Node.js Usage

```javascript
const {
  getCurrentPrice,
  getPastPrices,
  getFuturePrices,
  recommendBestTime
} = require('./powerpricecheck.js');

// All functions return Promises, so use async/await or .then()

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

### Node-RED Function Node Usage

You can also use this module in Node-RED by copying the code from `node-red-function.js` into a function node.

**Prerequisites:**
1. Install `axios` and `xml2js` globally in Node-RED or ensure they are available
2. Set `ENTSOE_API_KEY` as an environment variable in Node-RED `settings.js`:
   ```javascript
   functionGlobalContext: {
       // ... other settings
   },
   env: {
       ENTSOE_API_KEY: "your-api-token-here"
   }
   ```

**Setup Steps:**
1. Create a new function node in Node-RED
2. Copy the entire content from `node-red-function.js` file into the function node
3. Connect an inject node to send input messages
4. Connect a debug node to view the output

**Input Message Format:**
```javascript
msg.payload = {
    action: "recommendBestTime",  // Action to perform
    duration: 1                   // Optional: Duration in hours (default: 1)
}
```

**Output Message Format:**
```javascript
{
    status: "success",
    bestTime: {
        averagePrice: 7.15,
        start: "02:00",
        end: "02:00"
    },
    message: "The best time to run your appliance is between 02:00 and 02:00. The average price during this period is €7.15 per kWh."
}
```

**Example Flow:**
- Inject node → Function node (with code from `node-red-function.js`) → Debug node
- Set inject payload: `{"action": "recommendBestTime", "duration": 1}`

The Node-RED implementation includes:
- 1-hour caching to reduce API calls
- Detailed debug logging for troubleshooting
- Support for finding the best time to run appliances
- Automatic conversion from EUR/MWh to €cents/kWh

## API Reference

### getCurrentPrice()

Returns the current energy price from ENTSO-E API.

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

The module fetches real-time electricity prices from the ENTSO-E Transparency Platform:

1. **Fetches real prices** from the ENTSO-E Transparency Platform API
2. **Queries day-ahead market data** for the Netherlands (EIC code: 10YNL----------L)
3. **Converts prices** from EUR/MWh to euro cents/kWh (divides by 10)
4. **Caches data** for 1 hour to reduce API calls
5. **Analyzes price patterns** to find optimal time slots for running appliances

The `recommendBestTime()` function analyzes price forecasts to find the optimal time slot with the lowest average price for your appliance duration, helping you maximize energy cost savings.

## About Dutch Energy Prices

This module uses the Dutch EPEX spot market (day-ahead market) pricing structure via ENTSO-E, where:
- Prices are set through a daily auction for each hour of the following day
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
- ✅ ~~Node-RED function node integration~~ **IMPLEMENTED**
- Support for multiple regions and time zones
- Historical price analytics and trends
- Carbon intensity tracking based on Dutch energy mix
- Smart home device integration
- Support for dynamic energy contracts
- WebSocket support for real-time price updates

## License

MIT
