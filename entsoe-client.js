/**
 * ENTSO-E Transparency Platform API Client
 * Fetches real-time day-ahead electricity prices for the Netherlands
 */

const axios = require('axios');
const xml2js = require('xml2js');

const ENTSOE_API_BASE = 'https://web-api.tp.entsoe.eu/api';
const NETHERLANDS_DOMAIN = '10YNL----------L'; // EIC code for Netherlands

// Cache for price data to reduce API calls
let priceCache = {
  data: null,
  timestamp: null,
  expiryMs: 60 * 60 * 1000 // 1 hour cache
};

/**
 * Format date for ENTSO-E API (YYYYMMDDHHmm in UTC)
 */
const formatEntsoeDate = (date) => {
  const pad = (n) => n.toString().padStart(2, '0');
  return date.getUTCFullYear().toString() +
         pad(date.getUTCMonth() + 1) +
         pad(date.getUTCDate()) +
         pad(date.getUTCHours()) +
         pad(date.getUTCMinutes());
};

/**
 * Parse ENTSO-E XML response to extract price data
 */
const parseEntsoeXml = async (xml) => {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xml);
  
  if (!result || !result.Publication_MarketDocument) {
    throw new Error('Invalid XML response from ENTSO-E API');
  }

  const doc = result.Publication_MarketDocument;
  const timeSeries = Array.isArray(doc.TimeSeries) ? doc.TimeSeries : [doc.TimeSeries];
  
  const prices = [];
  
  for (const series of timeSeries) {
    if (!series || !series.Period) continue;
    
    const period = Array.isArray(series.Period) ? series.Period : [series.Period];
    
    for (const p of period) {
      if (!p || !p.Point) continue;
      
      const startDate = new Date(p.timeInterval.start);
      const points = Array.isArray(p.Point) ? p.Point : [p.Point];
      const resolution = p.resolution; // PT60M for hourly, PT15M for quarterly
      
      // Determine resolution in minutes
      let resolutionMinutes = 60; // default hourly
      if (resolution === 'PT15M') resolutionMinutes = 15;
      else if (resolution === 'PT30M') resolutionMinutes = 30;
      
      for (const point of points) {
        const position = parseInt(point.position) - 1; // Position is 1-indexed
        const priceEurMwh = parseFloat(point['price.amount']);
        
        // Calculate timestamp for this point
        const timestamp = new Date(startDate.getTime() + position * resolutionMinutes * 60 * 1000);
        
        // Convert EUR/MWh to euro cents/kWh (divide by 10)
        const priceCentsKwh = priceEurMwh / 10;
        
        prices.push({
          timestamp: timestamp.toISOString(),
          hour: timestamp.getHours(),
          price: Math.round(priceCentsKwh * 100) / 100,
          priceEurMwh: Math.round(priceEurMwh * 100) / 100
        });
      }
    }
  }
  
  // Sort by timestamp
  prices.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return prices;
};

/**
 * Fetch day-ahead prices from ENTSO-E API
 * @param {string} apiToken - ENTSO-E API token
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Array of price data
 */
const fetchDayAheadPrices = async (apiToken, startDate, endDate) => {
  if (!apiToken) {
    throw new Error('ENTSO-E API token is required');
  }

  const params = {
    securityToken: apiToken,
    documentType: 'A44', // Day-ahead prices
    in_Domain: NETHERLANDS_DOMAIN,
    out_Domain: NETHERLANDS_DOMAIN,
    periodStart: formatEntsoeDate(startDate),
    periodEnd: formatEntsoeDate(endDate)
  };

  try {
    const response = await axios.get(ENTSOE_API_BASE, {
      params,
      timeout: 30000 // 30 second timeout
    });

    const prices = await parseEntsoeXml(response.data);
    return prices;
  } catch (error) {
    if (error.response) {
      // API returned an error
      const status = error.response.status;
      if (status === 401) {
        throw new Error('Invalid ENTSO-E API token');
      } else if (status === 400) {
        throw new Error('Invalid request parameters');
      } else {
        throw new Error(`ENTSO-E API error: ${status}`);
      }
    } else if (error.request) {
      throw new Error('Failed to connect to ENTSO-E API');
    } else {
      throw error;
    }
  }
};

/**
 * Get cached price data or fetch new data
 * Fetches data from yesterday to tomorrow to have comprehensive coverage
 */
const getPriceData = async (apiToken) => {
  const now = Date.now();
  
  // Check if cache is still valid
  if (priceCache.data && priceCache.timestamp && (now - priceCache.timestamp) < priceCache.expiryMs) {
    return priceCache.data;
  }

  // Fetch new data
  const nowDate = new Date();
  
  // Start from yesterday to ensure we have past data
  const startDate = new Date(nowDate);
  startDate.setUTCDate(startDate.getUTCDate() - 1);
  startDate.setUTCHours(0, 0, 0, 0);
  
  // End at tomorrow to get future prices
  const endDate = new Date(nowDate);
  endDate.setUTCDate(endDate.getUTCDate() + 2);
  endDate.setUTCHours(0, 0, 0, 0);

  const prices = await fetchDayAheadPrices(apiToken, startDate, endDate);
  
  // Categorize prices as past, current, or future
  const currentHour = new Date();
  currentHour.setMinutes(0, 0, 0);
  const currentHourTime = currentHour.getTime();
  
  const categorizedPrices = prices.map(p => {
    const priceTime = new Date(p.timestamp);
    priceTime.setMinutes(0, 0, 0);
    const priceTimeMs = priceTime.getTime();
    
    let period;
    if (priceTimeMs < currentHourTime) {
      period = 'past';
    } else if (priceTimeMs === currentHourTime) {
      period = 'current';
    } else {
      period = 'future';
    }
    
    return {
      ...p,
      period
    };
  });

  // Update cache
  priceCache = {
    data: categorizedPrices,
    timestamp: now
  };

  return categorizedPrices;
};

/**
 * Clear the price cache (useful for testing)
 */
const clearCache = () => {
  priceCache = {
    data: null,
    timestamp: null,
    expiryMs: 60 * 60 * 1000
  };
};

module.exports = {
  fetchDayAheadPrices,
  getPriceData,
  clearCache,
  parseEntsoeXml,
  formatEntsoeDate
};
