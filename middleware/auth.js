const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    const user = await User.findById(decoded.id).select('-password').populate('role');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    const privilegedRoles = ['Super Admin', 'ICT Admin', 'HR Officer', 'Clerk', 'Finance Officer', 'Committee Officer'];
    const mfaSetupRoute = req.baseUrl === '/api/auth' && ['/mfa/setup', '/mfa/enable'].includes(req.path);
    if (process.env.REQUIRE_PRIVILEGED_MFA === 'true' && privilegedRoles.includes(user.role?.name) && !user.mfaEnabled && !mfaSetupRoute) {
      return res.status(403).json({ message: 'MFA setup is required for privileged accounts.', mfaSetupRequired: true });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User is not authenticated' });
  }

  const userRole = req.user.role?.name;
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  next();
};

exports.requireMfa = (req, res, next) => {
  const privilegedRoles = ['Super Admin', 'ICT Admin', 'HR Officer', 'Clerk', 'Finance Officer', 'Committee Officer'];
  if (process.env.REQUIRE_PRIVILEGED_MFA === 'false' || !privilegedRoles.includes(req.user?.role?.name)) return next();
  if (!req.user.mfaEnabled) return res.status(403).json({ message: 'MFA setup is required for privileged accounts.' });
  next();
};
