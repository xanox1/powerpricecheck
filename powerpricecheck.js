/**
 * PowerPriceCheck - A module for energy price information and appliance scheduling recommendations
 */

/**
 * Simulates energy price data (in cents per kWh)
 * In a real implementation, this would fetch from an API
 * Prices vary by hour of day (0-23)
 */
const generatePriceData = () => {
  const basePrice = 12;
  const prices = [];
  const now = new Date();
  
  for (let hourOffset = -24; hourOffset <= 24; hourOffset++) {
    const date = new Date(now.getTime() + hourOffset * 60 * 60 * 1000);
    const hour = date.getHours();
    
    // Peak hours (9-11, 17-21): higher prices
    // Off-peak hours (22-6): lower prices
    // Mid-peak hours: medium prices
    let price;
    if (hour >= 22 || hour <= 6) {
      price = basePrice - 4 + Math.random() * 2;
    } else if ((hour >= 9 && hour <= 11) || (hour >= 17 && hour <= 21)) {
      price = basePrice + 6 + Math.random() * 2;
    } else {
      price = basePrice + Math.random() * 2;
    }
    
    prices.push({
      timestamp: date.toISOString(),
      hour: date.getHours(),
      price: Math.round(price * 100) / 100,
      period: hourOffset < 0 ? 'past' : hourOffset === 0 ? 'current' : 'future'
    });
  }
  
  return prices;
};

/**
 * Get the current energy price
 * @returns {Object} Current price information
 */
const getCurrentPrice = () => {
  const prices = generatePriceData();
  const current = prices.find(p => p.period === 'current');
  return {
    price: current.price,
    timestamp: current.timestamp,
    hour: current.hour,
    unit: 'cents/kWh'
  };
};

/**
 * Get past energy prices
 * @param {number} hours - Number of hours to look back (default: 24)
 * @returns {Array} Array of past price data
 */
const getPastPrices = (hours = 24) => {
  const prices = generatePriceData();
  const pastPrices = prices.filter(p => p.period === 'past').slice(-hours);
  return pastPrices.map(p => ({
    price: p.price,
    timestamp: p.timestamp,
    hour: p.hour,
    unit: 'cents/kWh'
  }));
};

/**
 * Get future energy prices
 * @param {number} hours - Number of hours to look ahead (default: 24)
 * @returns {Array} Array of future price data
 */
const getFuturePrices = (hours = 24) => {
  const prices = generatePriceData();
  const futurePrices = prices.filter(p => p.period === 'future').slice(0, hours);
  return futurePrices.map(p => ({
    price: p.price,
    timestamp: p.timestamp,
    hour: p.hour,
    unit: 'cents/kWh'
  }));
};

/**
 * Recommend the best time to run an appliance
 * @param {number} durationHours - How long the appliance will run (default: 1)
 * @param {number} lookAheadHours - How many hours ahead to check (default: 24)
 * @returns {Object} Recommendation with best time slot and potential savings
 */
const recommendBestTime = (durationHours = 1, lookAheadHours = 24) => {
  const prices = generatePriceData();
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
      bestSlot = {
        startTime: slot[0].timestamp,
        startHour: slot[0].hour,
        endTime: slot[slot.length - 1].timestamp,
        endHour: slot[slot.length - 1].hour,
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
  
  return {
    recommendation: bestSlot,
    currentPrice: currentPrice,
    potentialSavings: potentialSavings,
    savingsPercentage: Math.round((potentialSavings / currentPrice) * 10000) / 100,
    unit: 'cents/kWh',
    durationHours: durationHours,
    message: potentialSavings > 0 
      ? `Wait until ${new Date(bestSlot.startTime).toLocaleTimeString()} to save ${potentialSavings} cents/kWh (${Math.round((potentialSavings / currentPrice) * 100)}%)` 
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
