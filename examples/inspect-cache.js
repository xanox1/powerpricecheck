/**
 * Example: How to inspect the global context cache in Node-RED
 * 
 * This demonstrates how to access and review the cached price data
 * that is stored in the global context.
 */

// Example 1: Simple inspection function
// You can use this in a separate Node-RED function node to view the cache

function inspectCache() {
    const cache = global.get('entsoePriceCache');
    
    if (!cache) {
        node.warn('No cache found in global context');
        return { payload: { status: 'no_cache' } };
    }
    
    const now = Date.now();
    const cacheAge = Math.round((now - cache.timestamp) / 1000); // seconds
    const timeUntilExpiry = Math.round((cache.timestamp + cache.cacheLifespanMs - now) / 1000); // seconds
    
    const summary = {
        status: 'cache_found',
        fetchedAt: cache.fetchedAt,
        cacheAge: `${cacheAge} seconds`,
        expiresAt: cache.expiresAt,
        timeUntilExpiry: `${timeUntilExpiry} seconds`,
        priceCount: cache.priceCount,
        isExpired: timeUntilExpiry < 0,
        firstPrice: cache.data[0],
        lastPrice: cache.data[cache.data.length - 1]
    };
    
    node.warn('Cache Summary:');
    node.warn(JSON.stringify(summary, null, 2));
    
    return { payload: summary };
}

// Example 2: Get all prices from cache
function getAllPricesFromCache() {
    const cache = global.get('entsoePriceCache');
    
    if (!cache || !cache.data) {
        return { payload: { error: 'No cache data available' } };
    }
    
    return { payload: { prices: cache.data } };
}

// Example 3: Get specific hour price from cache
function getPriceForHour(targetHour) {
    const cache = global.get('entsoePriceCache');
    
    if (!cache || !cache.data) {
        return { payload: { error: 'No cache data available' } };
    }
    
    const priceEntry = cache.data.find(p => {
        const date = new Date(p.timestamp);
        return date.getHours() === targetHour;
    });
    
    if (priceEntry) {
        return { 
            payload: { 
                hour: targetHour, 
                price: priceEntry.price, 
                timestamp: priceEntry.timestamp 
            } 
        };
    } else {
        return { payload: { error: `No price found for hour ${targetHour}` } };
    }
}

// Example 4: Clear the cache manually (useful for testing)
function clearCache() {
    global.set('entsoePriceCache', null);
    node.warn('Cache cleared from global context');
    return { payload: { status: 'cache_cleared' } };
}

// Example Node-RED Flow Setup:
/*
1. Create an inject node with any payload
2. Connect it to a function node with one of the above functions
3. Connect that to a debug node
4. Deploy and click the inject button

Example flows:

Flow 1: Inspect Cache
[Inject] -> [Function: inspectCache()] -> [Debug]

Flow 2: View All Prices
[Inject] -> [Function: getAllPricesFromCache()] -> [Debug]

Flow 3: Get Price for Hour 14 (2 PM)
[Inject] -> [Function: getPriceForHour(14)] -> [Debug]

Flow 4: Clear Cache
[Inject] -> [Function: clearCache()] -> [Debug]
*/

console.log('Example code for inspecting Node-RED global context cache');
console.log('Copy the functions above into Node-RED function nodes to use them');
