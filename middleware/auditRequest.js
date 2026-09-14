const { recordAudit } = require('./audit');

const redact = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(redact);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (/password|token|secret|authorization/i.test(key)) return [key, '[REDACTED]'];
    return [key, typeof item === 'object' ? redact(item) : item];
  }));
};

const auditApiRequest = (req, res, next) => {
  if (req.path === '/audit-logs') return next();
  const startedAt = Date.now();
  res.on('finish', () => {
    recordAudit({
      req,
      action: res.statusCode >= 400 ? 'API request failed' : 'API request',
      entity: 'API',
      details: {
        durationMs: Date.now() - startedAt,
        request: redact(req.body),
        query: redact(req.query),
      },
      statusCode: res.statusCode,
      success: res.statusCode < 400,
    });
  });
  next();
};

module.exports = { auditApiRequest };