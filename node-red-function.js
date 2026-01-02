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
 * Data Resolution Handling:
 * - ENTSO-E API may return 15-minute interval data (PT15M) or hourly data (PT60M)
 * - This function automatically detects the resolution and handles both formats
 * - 15-minute intervals are automatically aggregated into hourly averages
 * - This ensures consistent behavior regardless of API data format
 * 
 * Caching and Debugging:
 * - Cache is stored in GLOBAL context (not local context) for easy inspection
 * - Access cache via: global.get('entsoePriceCache')
 * - Cache contains: timestamp, fetchedAt, data (prices array), priceCount, expiresAt
 * - Cache lifetime: 1 hour (3600 seconds)
 * - You can view/inspect the cache in Node-RED debug panel or any function node
 * - This makes it easy to check for cache issues or review API results
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
 *       end: "03:00"  // End time shows when appliance finishes (start + duration)
 *     },
 *     currentPrice: 10.50,
 *     currentTimestamp: "2026-01-02T15:00:00.000Z",
 *     savings: 3.35,
 *     savingsPercentage: 31.9,
 *     message: "The best time to run your appliance is between 02:00 and 03:00. The average price during this period is €7.15 per kWh. Potential savings: 3.35 €cents/kWh (31.9%)."
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

    // Check cache validity in GLOBAL context (easier to inspect and debug)
    const cachedData = global.get(cacheKey);
    if (cachedData && now - cachedData.timestamp < CACHE_LIFESPAN) {
        node.warn(`[DEBUG] Using cached data from global context. Timestamp: ${cachedData.timestamp}`);
        node.warn(`[DEBUG] Cache age: ${Math.round((now - cachedData.timestamp) / 1000)} seconds`);
        return cachedData.data; // Return cached data with debug logs
    } else {
        node.warn(`[DEBUG] No valid cache found in global context. Will fetch new data.`);
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
            
            // Determine resolution (PT60M for hourly, PT15M for 15-minute intervals)
            const resolution = period.resolution || 'PT60M';
            let resolutionMinutes = 60; // default hourly
            if (resolution === 'PT15M') resolutionMinutes = 15;
            else if (resolution === 'PT30M') resolutionMinutes = 30;
            
            node.warn(`[DEBUG] Processing period with resolution: ${resolution} (${resolutionMinutes} minutes)`);

            points.forEach((point) => {
                const priceEurMwh = parseFloat(point["price.amount"]);
                const position = parseInt(point.position) - 1; // Position is 1-indexed
                const timestamp = new Date(
                    periodStart.getTime() +
                    position * resolutionMinutes * 60 * 1000
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

        // Cache the parsed data in GLOBAL context (easier to inspect and debug)
        const newCache = {
            timestamp: now,
            fetchedAt: new Date(now).toISOString(),
            data: prices,
            priceCount: prices.length,
            cacheLifespanMs: CACHE_LIFESPAN,
            expiresAt: new Date(now + CACHE_LIFESPAN).toISOString()
        };
        global.set(cacheKey, newCache);
        node.warn(`[DEBUG] Price data cached in global context (key: '${cacheKey}')`);
        node.warn(`[DEBUG] Cache expires at: ${newCache.expiresAt}`);
        node.warn(`[DEBUG] Access cache via: global.get('${cacheKey}')`);

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
        
        // Validate lookAheadHours parameter
        if (typeof lookAheadHours !== 'number' || lookAheadHours < 1 || lookAheadHours > 168) {
            msg.payload = {
                status: "error",
                message: "Invalid lookAheadHours parameter. Must be a number between 1 and 168 (1 week).",
            };
            node.send(msg);
            return;
        }
        
        const future = new Date(now.getTime() + lookAheadHours * 60 * 60 * 1000);

        let prices = await getCachedPriceData(now, future);
        
        // If we have 15-minute interval data (more than one price per hour), 
        // aggregate to hourly averages for easier processing
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
        
        node.warn(`[DEBUG] Aggregated ${prices.length} price entries into ${hourlyPrices.length} hourly averages`);

        if (action === "recommendBestTime") {
            const duration = parseInt(msg.payload.duration) || 1; // Appliance runtime in hours (ensure it's a number)
            let bestSlot = null;
            let lowestAvgPrice = Infinity;

            for (let i = 0; i <= hourlyPrices.length - duration; i++) {
                const slot = hourlyPrices.slice(i, i + duration);
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
                // Start time is the beginning of the first hour in the slot
                const startDate = new Date(bestSlot[0].timestamp);
                const startTime = formatter.format(startDate);
                
                // End time is when the appliance finishes (start + duration hours)
                const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
                const endTime = formatter.format(endDate);

                // Retrieve the current price from hourly aggregated data
                // Get the start of the current hour
                const currentHourStart = new Date(now);
                currentHourStart.setMinutes(0, 0, 0);
                const currentHourKey = currentHourStart.toISOString();
                
                // Find the current hour in hourly prices
                let currentPriceValue = null;
                let currentTimestamp = null;
                const currentHourPrice = hourlyPrices.find(p => p.timestamp === currentHourKey);
                
                if (currentHourPrice) {
                    currentPriceValue = currentHourPrice.price;
                    currentTimestamp = currentHourPrice.timestamp;
                    node.warn(`[DEBUG] Current hour price found: ${currentPriceValue} €cents/kWh`);
                }
                
                // Only proceed if we have a current price
                if (currentPriceValue === null) {
                    msg.payload = {
                        status: "error",
                        message: "Could not determine current price from available data. The current hour may not be included in the fetched price data.",
                    };
                    node.send(msg);
                    return;
                }

                // Log current price info in debug
                node.warn(`[DEBUG] Current Price: ${currentPriceValue} €cents/kWh at ${currentTimestamp}`);
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
                    currentTimestamp,
                    savings: Math.round(savings * 100) / 100,
                    savingsPercentage,
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
