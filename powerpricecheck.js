/**
 * PowerPriceCheck - A module for energy price information and appliance scheduling recommendations
 * Fetches real-time data from ENTSO-E Transparency Platform API
 */

const entsoeClient = require('./entsoe-client.js');

// Load API token from environment (required)
const ENTSOE_API_TOKEN = process.env.ENTSOE_API_TOKEN;

if (!ENTSOE_API_TOKEN) {
  throw new Error('ENTSOE_API_TOKEN environment variable is required. Get your token at https://transparency.entsoe.eu/');
}

/**
 * Get price data from ENTSO-E API
 * @returns {Promise<Array>} Price data
 */
const getPriceData = async () => {
  return await entsoeClient.getPriceData(ENTSOE_API_TOKEN);
};

/**
 * Get the current energy price
 * @returns {Promise<Object>} Current price information
 */
const getCurrentPrice = async () => {
  const prices = await getPriceData();
  const current = prices.find(p => p.period === 'current');
  return {
    price: current.price,
    timestamp: current.timestamp,
    hour: current.hour,
    unit: '€cents/kWh'
  };
};

/**
 * Get past energy prices
 * @param {number} hours - Number of hours to look back (default: 24)
 * @returns {Promise<Array>} Array of past price data
 */
const getPastPrices = async (hours = 24) => {
  const prices = await getPriceData();
  const pastPrices = prices.filter(p => p.period === 'past').slice(-hours);
  return pastPrices.map(p => ({
    price: p.price,
    timestamp: p.timestamp,
    hour: p.hour,
    unit: '€cents/kWh'
  }));
};

/**
 * Get future energy prices
 * @param {number} hours - Number of hours to look ahead (default: 24)
 * @returns {Promise<Array>} Array of future price data
 */
const getFuturePrices = async (hours = 24) => {
  const prices = await getPriceData();
  const futurePrices = prices.filter(p => p.period === 'future').slice(0, hours);
  return futurePrices.map(p => ({
    price: p.price,
    timestamp: p.timestamp,
    hour: p.hour,
    unit: '€cents/kWh'
  }));
};

/**
 * Recommend the best time to run an appliance
 * @param {number} durationHours - How long the appliance will run (default: 1)
 * @param {number} lookAheadHours - How many hours ahead to check (default: 24)
 * @returns {Promise<Object>} Recommendation with best time slot and potential savings
 */
const recommendBestTime = async (durationHours = 1, lookAheadHours = 24) => {
  const prices = await getPriceData();
  const currentAndFuture = prices.filter(p => p.period === 'current' || p.period === 'future').slice(0, lookAheadHours + 1);
  
  if (currentAndFuture.length < durationHours) {
    return {
      error: 'Not enough data for the requested duration'
    };
  }
  
  let bestSlot = null;
  let lowestAvgPrice = Infinity;
  
  // Find the time slot with the lowest average price
  for (let i = 0; i <= currentAndFuture.length - durationHours; i++) {
    const slot = currentAndFuture.slice(i, i + durationHours);
    const avgPrice = slot.reduce((sum, p) => sum + p.price, 0) / slot.length;
    
    if (avgPrice < lowestAvgPrice) {
      lowestAvgPrice = avgPrice;
      const startDate = new Date(slot[0].timestamp);
      const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
      bestSlot = {
        startTime: slot[0].timestamp,
        startHour: slot[0].hour,
        endTime: endDate.toISOString(),
        endHour: endDate.getUTCHours(),
        averagePrice: Math.round(avgPrice * 100) / 100,
        prices: slot.map(p => ({
          timestamp: p.timestamp,
          hour: p.hour,
          price: p.price
        }))
      };
    }
  }
  
  // Calculate current price for comparison
  const currentPrice = currentAndFuture[0].price;
  const potentialSavings = Math.round((currentPrice - lowestAvgPrice) * 100) / 100;
  const savingsPercentage = Math.round((potentialSavings / currentPrice) * 10000) / 100;
  
  return {
    recommendation: bestSlot,
    currentPrice: currentPrice,
    potentialSavings: potentialSavings,
    savingsPercentage: savingsPercentage,
    unit: '€cents/kWh',
    durationHours: durationHours,
    message: potentialSavings > 0 
      ? `Wait until ${new Date(bestSlot.startTime).toLocaleTimeString()} to save ${potentialSavings} €cents/kWh (${savingsPercentage}%)` 
      : 'Current time is already optimal'
  };
};

// Export functions
module.exports = {
  getCurrentPrice,
  getPastPrices,
  getFuturePrices,
  recommendBestTime
};
