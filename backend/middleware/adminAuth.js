const adminAuth = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  
  console.log('Admin auth failed');
  return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
};

module.exports = adminAuth; 