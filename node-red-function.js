/**
 * Node-RED Function Node Example for PowerPriceCheck
 * 
 * This is a self-contained function that can be used directly in a Node-RED function node.
 * 
 * Prerequisites:
 * - Install axios and xml2js globally in Node-RED settings or ensure they are available
 * - Set ENTSOE_API_KEY as an environment variable in Node-RED settings.js
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
 *     duration: 1                    // Optional: Duration in hours (default: 1)
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
 *     message: "The best time to run your appliance is between 02:00 and 02:00..."
 *   }
 * }
 */

// Dependencies (ensure these are globally available in Node-RED)
// - axios 
// - xml2js

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
    const url = `https://web-api.tp.entsoe.eu/api?securityToken=${env.get(
        "ENTSOE_API_KEY"
    )}&documentType=A44&in_Domain=10YNL----------L&out_Domain=10YNL----------L&periodStart=${start}&periodEnd=${end}`;

    // Log formatted API request details
    node.warn(`[DEBUG] Formatted API URL: ${url}`);

    try {
        // Make the API call
        const response = await axios.get(url);
        const rawData = response.data;

        // Log API response sample
        node.warn(`[DEBUG] Raw API response received. Sample: ${rawData.substring(0, 200)}...`);

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
        const future24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        let prices = await getCachedPriceData(now, future24h);

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
                const currentPrice = prices.find(
                    p =>
                        new Date(p.timestamp) <= new Date() &&
                        new Date(p.timestamp).getHours() === new Date().getHours()
                );
                const currentPriceValue = currentPrice ? currentPrice.price : 0;

                const savings = currentPriceValue ? currentPriceValue - lowestAvgPrice : 0;
                const savingsPercentage = currentPriceValue
                    ? (savings / currentPriceValue) * 100
                    : 0;

                const message = `The best time to run your appliance is between ${startTime} and ${endTime}. The average price during this period is €${lowestAvgPrice.toFixed(
                    2
                )} per kWh.`;

                // Log the recommendation message
                node.warn(`[DEBUG] Recommendation: ${message}`);

                msg.payload = {
                    status: "success",
                    bestTime: {
                        averagePrice: Math.round(lowestAvgPrice * 100) / 100,
                        start: startTime,
                        end: endTime,
                    },
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
