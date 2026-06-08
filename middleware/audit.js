const AuditLog = require('../models/AuditLog');

exports.recordAudit = async ({ req, user, action, entity, entityId, details }) => {
  try {
    await AuditLog.create({
      user: user?._id || req?.user?._id,
      action,
      entity,
      entityId: entityId?.toString(),
      details,
      method: req?.method,
      path: req?.originalUrl,
      ip: req?.headers['x-forwarded-for']?.split(',')[0] || req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};
