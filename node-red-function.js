/**
 * Node-RED Function Node Example for PowerPriceCheck
 * 
 * This is a self-contained function that can be used directly in a Node-RED function node.
 * 
 * Prerequisites:
 * - Install axios and xml2js in Node-RED:
 *   1. Run in Node-RED directory: npm install axios xml2js
 *   2. Add to settings.js functionGlobalContext:
 *      functionGlobalContext: {
 *          axios: require('axios'),
 *          xml2js: require('xml2js')
 *      }
 * - Set ENTSOE_API_KEY as an environment variable in Node-RED settings.js:
 *   env: {
 *       ENTSOE_API_KEY: "your-api-token-here"
 *   }
 * 
 * Usage:
 * 1. Copy the entire content below into a Node-RED function node
 * 2. Send a message with msg.payload.action = "recommendBestTime" and optionally msg.payload.duration
 * 3. The node will output the recommendation with best time and potential savings
 * 
 * Input message format:
 * {
 *   payload: {
 *     action: "recommendBestTime",  // Currently supported action
 *     duration: 1,                   // Optional: Duration in hours (default: 1)
 *     lookAheadHours: 6              // Optional: Time window to search (default: 6)
 *   }
 * }
 * 
 * Output message format:
 * {
 *   payload: {
 *     status: "success",
 *     bestTime: {
 *       averagePrice: 7.15,
 *       start: "02:00",
 *       end: "02:00"
 *     },
 *     currentPrice: 10.50,
 *     currentTimestamp: "2026-01-02T15:00:00.000Z",
 *     savings: 3.35,
 *     savingsPercentage: 31.9,
 *     message: "The best time to run your appliance is between 02:00 and 02:00. The average price during this period is €7.15 per kWh. Potential savings: 3.35 €cents/kWh (31.9%)."
 *   }
 * }
 */

// Load required modules from global context
const axios = global.get('axios');
const xml2js = global.get('xml2js');

// Validate dependencies
if (!axios) {
    node.error('axios module not found. Please add it to functionGlobalContext in settings.js');
    return;
}
if (!xml2js) {
    node.error('xml2js module not found. Please add it to functionGlobalContext in settings.js');
    return;
}

// Cache lifespan in milliseconds (e.g., 1 hour)
const CACHE_LIFESPAN = 60 * 60 * 1000;

// Function to fetch and cache price data
const getCachedPriceData = async (startDate, endDate) => {
    const cacheKey = "entsoePriceCache";
    const now = Date.now();

    // Log start of fetch process
    node.warn(`Fetching price data for range: ${startDate} to ${endDate}`);
    node.warn(`[DEBUG] Current timestamp: ${now}`);

    // Check cache validity
    const cachedData = context.get(cacheKey);
    if (cachedData && now - cachedData.timestamp < CACHE_LIFESPAN) {
        node.warn(`[DEBUG] Cached data found. Timestamp: ${cachedData.timestamp}`);
        return cachedData.data; // Return cached data with debug logs
    } else {
        node.warn(`[DEBUG] No valid cache found. Will fetch new data.`);
    }

    // Format dates for API
    const formatter = (date) => {
        const pad = (n) => n.toString().padStart(2, "0");
        return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}00`;
    };

    const start = formatter(new Date(startDate));
    const end = formatter(new Date(endDate));
    const apiKey = env.get("ENTSOE_API_KEY");
    
    if (!apiKey) {
        node.error("[ERROR] ENTSOE_API_KEY not found in environment variables");
        throw new Error("ENTSOE_API_KEY not configured");
    }
    
    const url = `https://web-api.tp.entsoe.eu/api?securityToken=${apiKey}&documentType=A44&in_Domain=10YNL----------L&out_Domain=10YNL----------L&periodStart=${start}&periodEnd=${end}`;

    // Log formatted API request details (without exposing the full key)
    const maskedKey = apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
    node.warn(`[DEBUG] API request with key: ${maskedKey}, period: ${start} to ${end}`);

    try {
        // Make the API call
        const response = await axios.get(url);
        const rawData = response.data;

        // Log API response info (without full data to avoid exposing sensitive info)
        node.warn(`[DEBUG] Raw API response received. Length: ${rawData.length} characters`);

        // Parse the XML response
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(rawData);

        if (!result || !result.Publication_MarketDocument) {
            const errorMessage = "Invalid or unexpected response from ENTSO-E API";
            node.error(`[ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }

        node.warn("[DEBUG] Successfully parsed XML response.");

        // Parse and process time series data
        const timeSeriesArray = Array.isArray(result.Publication_MarketDocument.TimeSeries)
            ? result.Publication_MarketDocument.TimeSeries
            : [result.Publication_MarketDocument.TimeSeries];

        const prices = [];
        timeSeriesArray.forEach((series) => {
            const period = series.Period;
            if (!period || !period.Point) {
                node.warn("[DEBUG] Skipping invalid time series period.");
                return;
            }

            const periodStart = new Date(period.timeInterval.start);
            const points = Array.isArray(period.Point)
                ? period.Point
                : [period.Point];

            points.forEach((point) => {
                const priceEurMwh = parseFloat(point["price.amount"]);
                const timestamp = new Date(
                    periodStart.getTime() +
                    (parseInt(point.position) - 1) * 60 * 60 * 1000
                );
                const price = priceEurMwh / 10; // Convert EUR/MWh to €cents/kWh

                prices.push({
                    timestamp: timestamp.toISOString(),
                    price: Math.round(price * 100) / 100,
                    unit: "€cents/kWh",
                });
            });
        });

        // Log processed data sample
        node.warn(`[DEBUG] Parsed ${prices.length} price entries. Example: ${JSON.stringify(prices[0], null, 2)}`);

        // Cache the parsed data
        const newCache = {
            timestamp: now,
            data: prices,
        };
        context.set(cacheKey, newCache);

        return prices;
    } catch (err) {
        node.error(`[ERROR] Failed to fetch or parse ENTSO-E API data: ${err.message}`);
        throw new Error(`Failed to fetch or parse data: ${err.message}`);
    }
};

/**
 * Main Function to Handle the Request
 */
(async () => {
    try {
        const action = msg.payload.action;

        // Log the payload and action
        node.warn(`[DEBUG] Received action: ${action}`);
        node.warn(`[DEBUG] Message payload: ${JSON.stringify(msg.payload, null, 2)}`);

        const now = new Date();
        const lookAheadHours = msg.payload.lookAheadHours || 6; // Default to 6 hours lookahead
        const future = new Date(now.getTime() + lookAheadHours * 60 * 60 * 1000);

        let prices = await getCachedPriceData(now, future);

        if (action === "recommendBestTime") {
            const duration = msg.payload.duration || 1; // Appliance runtime in hours
            let bestSlot = null;
            let lowestAvgPrice = Infinity;

            for (let i = 0; i <= prices.length - duration; i++) {
                const slot = prices.slice(i, i + duration);
                const avgPrice =
                    slot.reduce((sum, p) => sum + p.price, 0) / slot.length;

                if (avgPrice < lowestAvgPrice) {
                    lowestAvgPrice = avgPrice;
                    bestSlot = slot;
                }
            }

            if (bestSlot) {
                const formatter = new Intl.DateTimeFormat("en-NL", {
                    timeZone: "Europe/Amsterdam",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                });

                // Format start and end time
                const startTime = formatter.format(new Date(bestSlot[0].timestamp));
                const endTime = formatter.format(
                    new Date(bestSlot[bestSlot.length - 1].timestamp)
                );

                // Retrieve the current price
                // Get the start of the current hour
                const currentHourStart = new Date(now);
                currentHourStart.setMinutes(0, 0, 0);
                const currentHourEnd = new Date(currentHourStart);
                currentHourEnd.setHours(currentHourEnd.getHours() + 1);
                
                const currentHourStartTime = currentHourStart.getTime();
                const currentHourEndTime = currentHourEnd.getTime();
                
                // Find the price that matches the current hour
                let currentPrice = null;
                let currentTimestamp = null;
                for (const p of prices) {
                    const priceTime = new Date(p.timestamp).getTime();
                    // Check if price is within the current hour window
                    if (priceTime >= currentHourStartTime && priceTime < currentHourEndTime) {
                        currentPrice = p;
                        currentTimestamp = p.timestamp;
                        break;
                    }
                }
                
                // If no current price found, try to get the first price in our dataset
                if (!currentPrice && prices.length > 0) {
                    currentPrice = prices[0];
                    currentTimestamp = prices[0].timestamp;
                    node.warn(`[DEBUG] Current hour price not found, using first available price from dataset`);
                }
                
                const currentPriceValue = currentPrice ? currentPrice.price : null;
                
                // Only proceed if we have a current price
                if (currentPriceValue === null) {
                    msg.payload = {
                        status: "error",
                        message: "Could not determine current price from available data.",
                    };
                    node.send(msg);
                    return;
                }

                // Log current price info in debug
                node.warn(`[DEBUG] Current Price: ${currentPriceValue} €cents/kWh at ${currentTimestamp || now.toISOString()}`);
                node.warn(`[DEBUG] Look-ahead window: ${lookAheadHours} hours`);

                // Calculate savings (handle both positive and negative cases)
                const savings = currentPriceValue - lowestAvgPrice;
                const savingsPercentage = currentPriceValue > 0
                    ? Math.round((savings / currentPriceValue) * 10000) / 100
                    : 0;

                // Generate message based on whether there are savings
                let message;
                if (savings > 0) {
                    message = `The best time to run your appliance is between ${startTime} and ${endTime}. The average price during this period is €${lowestAvgPrice.toFixed(
                        2
                    )} per kWh. Potential savings: ${savings.toFixed(2)} €cents/kWh (${savingsPercentage.toFixed(1)}%).`;
                } else if (savings < 0) {
                    message = `The best time to run your appliance is between ${startTime} and ${endTime}. The average price during this period is €${lowestAvgPrice.toFixed(
                        2
                    )} per kWh. Note: This is ${Math.abs(savings).toFixed(2)} €cents/kWh more than the current price.`;
                } else {
                    message = `The best time to run your appliance is between ${startTime} and ${endTime}. The average price during this period is €${lowestAvgPrice.toFixed(
                        2
                    )} per kWh. This is the same as the current price.`;
                }

                // Log the recommendation message
                node.warn(`[DEBUG] Recommendation: ${message}`);

                msg.payload = {
                    status: "success",
                    bestTime: {
                        averagePrice: Math.round(lowestAvgPrice * 100) / 100,
                        start: startTime,
                        end: endTime,
                    },
                    currentPrice: currentPriceValue,
                    currentTimestamp: currentTimestamp || now.toISOString(),
                    savings: Math.round(savings * 100) / 100,
                    savingsPercentage: savingsPercentage,
                    message,
                };
            } else {
                msg.payload = {
                    status: "error",
                    message: "Not enough data available to calculate the best time.",
                };
            }
        } else {
            msg.payload = {
                status: "error",
                message: "Invalid action specified!",
            };
        }

        // Send the final message
        node.warn("[DEBUG] Final payload sent out.");
        node.send(msg);
    } catch (err) {
        node.error(`[ERROR] Unhandled error: ${err.message}`);
    }
})();
