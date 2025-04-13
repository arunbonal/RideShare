const Redis = require('ioredis');
const { recordHit, recordMiss } = require('./cacheStats');

const redis = new Redis(process.env.REDIS_URL);

// Cache durations in seconds
const CACHE_DURATIONS = {
  USER_PROFILE: 3600, // 1 hour
  NOTIFICATIONS: 300, // 5 minutes
  ACTIVE_RIDE: 300,  // 5 minutes
};

// Cache keys
const CACHE_KEYS = {
  USER_PROFILE: (userId) => `user:${userId}:profile`,
  USER_NOTIFICATIONS: (userId) => `user:${userId}:notifications`,
  ACTIVE_RIDE: (rideId) => `ride:${rideId}:details`,
  USER_ACTIVE_RIDES: (userId) => `user:${userId}:active_rides`,
};

// Cache user profile
exports.cacheUserProfile = async (userId, profileData) => {
  try {
    const key = CACHE_KEYS.USER_PROFILE(userId);
    await redis.setex(key, CACHE_DURATIONS.USER_PROFILE, JSON.stringify(profileData));
  } catch (error) {
    console.error('Error caching user profile:', error);
  }
};

// Get cached user profile
exports.getCachedUserProfile = async (userId) => {
  try {
    const key = CACHE_KEYS.USER_PROFILE(userId);
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      recordHit('profiles');
      return JSON.parse(cachedData);
    }
    
    recordMiss('profiles');
    return null;
  } catch (error) {
    console.error('Error getting cached user profile:', error);
    return null;
  }
};

// Cache user notifications
exports.cacheUserNotifications = async (userId, notifications) => {
  try {
    const key = CACHE_KEYS.USER_NOTIFICATIONS(userId);
    await redis.setex(key, CACHE_DURATIONS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error caching user notifications:', error);
  }
};

// Get cached user notifications
exports.getCachedUserNotifications = async (userId) => {
  try {
    const key = CACHE_KEYS.USER_NOTIFICATIONS(userId);
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      recordHit('notifications');
      return JSON.parse(cachedData);
    }
    
    recordMiss('notifications');
    return null;
  } catch (error) {
    console.error('Error getting cached user notifications:', error);
    return null;
  }
};

// Cache active ride
exports.cacheActiveRide = async (rideId, rideData) => {
  try {
    const key = CACHE_KEYS.ACTIVE_RIDE(rideId);
    await redis.setex(key, CACHE_DURATIONS.ACTIVE_RIDE, JSON.stringify(rideData));
  } catch (error) {
    console.error('Error caching active ride:', error);
  }
};

// Get cached active ride
exports.getCachedActiveRide = async (rideId) => {
  try {
    const key = CACHE_KEYS.ACTIVE_RIDE(rideId);
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      recordHit('rides');
      return JSON.parse(cachedData);
    }
    
    recordMiss('rides');
    return null;
  } catch (error) {
    console.error('Error getting cached active ride:', error);
    return null;
  }
};

// Cache user's active rides
exports.cacheUserActiveRides = async (userId, rides) => {
  try {
    const key = CACHE_KEYS.USER_ACTIVE_RIDES(userId);
    await redis.setex(key, CACHE_DURATIONS.ACTIVE_RIDE, JSON.stringify(rides));
  } catch (error) {
    console.error('Error caching user active rides:', error);
  }
};

// Get user's cached active rides
exports.getCachedUserActiveRides = async (userId) => {
  try {
    const key = CACHE_KEYS.USER_ACTIVE_RIDES(userId);
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      recordHit('rides');
      return JSON.parse(cachedData);
    }
    
    recordMiss('rides');
    return null;
  } catch (error) {
    console.error('Error getting cached user active rides:', error);
    return null;
  }
};

// Invalidate user profile cache
exports.invalidateUserProfileCache = async (userId) => {
  try {
    const key = CACHE_KEYS.USER_PROFILE(userId);
    await redis.del(key);
  } catch (error) {
    console.error('Error invalidating user profile cache:', error);
  }
};

// Invalidate user notifications cache
exports.invalidateUserNotificationsCache = async (userId) => {
  try {
    const key = CACHE_KEYS.USER_NOTIFICATIONS(userId);
    await redis.del(key);
  } catch (error) {
    console.error('Error invalidating user notifications cache:', error);
  }
};

// Invalidate active ride cache
exports.invalidateActiveRideCache = async (rideId) => {
  try {
    const key = CACHE_KEYS.ACTIVE_RIDE(rideId);
    await redis.del(key);
  } catch (error) {
    console.error('Error invalidating active ride cache:', error);
  }
};

// Invalidate user's active rides cache
exports.invalidateUserActiveRidesCache = async (userId) => {
  try {
    const key = CACHE_KEYS.USER_ACTIVE_RIDES(userId);
    await redis.del(key);
  } catch (error) {
    console.error('Error invalidating user active rides cache:', error);
  }
}; 