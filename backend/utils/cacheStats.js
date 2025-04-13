// Cache statistics tracker
let cacheStats = {
  profiles: {
    hits: 0,
    misses: 0
  },
  rides: {
    hits: 0,
    misses: 0
  },
  notifications: {
    hits: 0,
    misses: 0
  }
};

// Record a cache hit
exports.recordHit = (type) => {
  if (cacheStats[type]) {
    cacheStats[type].hits++;
  }
};

// Record a cache miss
exports.recordMiss = (type) => {
  if (cacheStats[type]) {
    cacheStats[type].misses++;
  }
};

// Get current stats
exports.getStats = () => {
  const stats = {};
  
  // Calculate percentages for each type
  for (const [type, data] of Object.entries(cacheStats)) {
    const total = data.hits + data.misses;
    stats[type] = {
      total,
      hitRate: total > 0 ? (data.hits / total) * 100 : 0,
      hits: data.hits,
      misses: data.misses
    };
  }
  
  return stats;
};

// Reset stats
exports.resetStats = () => {
  for (const type in cacheStats) {
    cacheStats[type] = {
      hits: 0,
      misses: 0
    };
  }
}; 