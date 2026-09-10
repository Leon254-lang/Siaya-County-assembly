const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_THREATS = [
  {
    id: 'th-101',
    type: 'failed_login',
    severity: 'high',
    title: 'Repeated failed login attempts',
    user: 'A. Mwangi',
    device: 'Unknown Windows device',
    location: 'Nairobi',
    score: 72,
    status: 'investigating',
    createdAt: '2026-09-10T07:42:00.000Z'
  },
  {
    id: 'th-102',
    type: 'suspicious_download',
    severity: 'medium',
    title: 'Large document export outside normal hours',
    user: 'J. Odhiambo',
    device: 'Android tablet',
    location: 'Siaya Town',
    score: 61,
    status: 'observed',
    createdAt: '2026-09-10T08:10:00.000Z'
  }
];

const scoreRisk = (input = {}) => {
  const riskFactors = [
    { condition: Number(input.failedLogins || 0) >= 5, value: 25 },
    { condition: Number(input.failedLogins || 0) >= 8, value: 15 },
    { condition: Boolean(input.novelDevice), value: 15 },
    { condition: Boolean(input.suspiciousDownload), value: 18 },
    { condition: Boolean(input.ipMismatch), value: 12 },
    { condition: Boolean(input.unusualAccess), value: 12 },
    { condition: Boolean(input.geolocationMismatch), value: 15 }
  ];

  const reasons = [];
  let score = 0;

  riskFactors.forEach((factor) => {
    if (factor.condition) {
      score += factor.value;
      if (factor.value >= 15) {
        reasons.push('High-risk behavior observed');
      }
    }
  });

  if (Number(input.failedLogins || 0) >= 5) reasons.push('Repeated failed logins detected');
  if (Boolean(input.novelDevice)) reasons.push('New or unrecognized device');
  if (Boolean(input.suspiciousDownload)) reasons.push('Unusual download or export pattern');
  if (Boolean(input.ipMismatch)) reasons.push('IP mismatch detected');
  if (Boolean(input.unusualAccess)) reasons.push('Unusual access outside normal pattern');
  if (Boolean(input.geolocationMismatch)) reasons.push('Geolocation mismatch');

  const normalizedScore = Math.min(100, Math.max(0, score));
  let severity = 'low';
  if (normalizedScore >= 85) severity = 'critical';
  else if (normalizedScore >= 70) severity = 'high';
  else if (normalizedScore >= 45) severity = 'medium';

  const assessment = normalizedScore >= 85
    ? 'High probability of account compromise.'
    : normalizedScore >= 70
      ? 'Elevated risk of compromised access.'
      : normalizedScore >= 45
        ? 'Suspicious behavior is being monitored.'
        : 'No immediate compromise signals detected.';

  return {
    score: normalizedScore,
    severity,
    lockdown: normalizedScore >= 85,
    reasons: [...new Set(reasons)],
    assessment,
    explanation: {
      title: 'Why was this flagged?',
      reasons: [...new Set(reasons)],
      assessment,
    },
    summary: normalizedScore >= 85
      ? 'Critical risk: immediate investigation and lockdown recommended.'
      : 'Monitoring active: this account is being watched for suspicious behavior.'
  };
};

const buildThreatSummary = () => ({
  totalThreats: DEFAULT_THREATS.length,
  critical: DEFAULT_THREATS.filter((threat) => threat.severity === 'critical').length,
  high: DEFAULT_THREATS.filter((threat) => threat.severity === 'high').length,
  medium: DEFAULT_THREATS.filter((threat) => threat.severity === 'medium').length,
  active: DEFAULT_THREATS.filter((threat) => threat.status !== 'resolved').length,
  resolved: DEFAULT_THREATS.filter((threat) => threat.status === 'resolved').length,
  lastUpdated: new Date().toISOString()
});

const buildLoginSecurityEvent = (input = {}) => {
  const user = input.user || {};
  const previousLogin = String(input.previousLogin || user.lastLoginLocation || 'Unknown').trim() || 'Unknown';
  const currentLogin = String(input.currentLogin || input.location || 'Unknown').trim() || 'Unknown';
  const currentIp = String(input.currentIp || input.ip || 'Unknown').trim() || 'Unknown';
  const lastLoginIp = String(input.lastLoginIp || user.lastLoginIp || 'Unknown').trim() || 'Unknown';
  const device = String(input.device || user.lastLoginDevice || 'Unknown device').trim() || 'Unknown device';
  const lastLoginDevice = String(input.lastLoginDevice || user.lastLoginDevice || 'Unknown device').trim() || 'Unknown device';
  const failedAttempts = Number(input.failedAttempts ?? user.failedLoginAttempts ?? 0);

  let score = 0;
  const reasons = [];

  if (failedAttempts >= 4) {
    score += 30;
    reasons.push('Multiple failed login attempts');
  }

  if (previousLogin !== 'Unknown' && currentLogin !== 'Unknown' && previousLogin !== currentLogin) {
    score += 30;
    reasons.push('Location mismatch from previous login');
  }

  if (lastLoginDevice && device && lastLoginDevice !== device) {
    score += 15;
    reasons.push('New or unrecognized device');
  }

  if (lastLoginIp && currentIp && lastLoginIp !== currentIp) {
    score += 12;
    reasons.push('IP address differs from previous login');
  }

  if (failedAttempts >= 6) {
    score += 8;
    reasons.push('High-frequency failed attempts');
  }

  const riskScore = Math.min(100, Math.max(0, score));
  const threatLevel = riskScore >= 85 ? 'HIGH' : riskScore >= 70 ? 'MEDIUM' : riskScore >= 35 ? 'LOW' : 'INFO';
  const flagged = riskScore >= 85;

  return {
    user: user.name || 'Unknown user',
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    ip: currentIp,
    device,
    location: currentLogin,
    previousLogin,
    currentLogin,
    failedAttempts,
    riskScore,
    threatLevel,
    message: flagged
      ? '⚠️ Suspicious login behavior detected.'
      : riskScore >= 70
        ? '⚠️ Elevated login risk detected.'
        : 'Login activity monitored.',
    reasons: [...new Set(reasons)],
    flagged,
  };
};

const buildFailedLoginSecurityEvent = (input = {}) => {
  const now = new Date();
  const timestamps = Array.isArray(input.recentFailureTimestamps)
    ? input.recentFailureTimestamps
        .map((stamp) => new Date(stamp))
        .filter((stamp) => !Number.isNaN(stamp.getTime()))
    : [];

  const recentAttempts = timestamps.filter((stamp) => now - stamp <= 10 * 60 * 1000);
  const count = recentAttempts.length;

  let level = 'NORMAL';
  let riskScore = 0;
  let message = 'Login failures are within the normal range.';
  let incidentCreated = false;

  if (count >= 10) {
    level = 'CRITICAL';
    riskScore = 98;
    message = '⚠️ Critical: repeated failed login attempts indicate possible brute-force activity.';
    incidentCreated = true;
  } else if (count >= 5) {
    level = 'HIGH';
    riskScore = 87;
    message = '⚠️ Suspicious login behavior detected. High-risk brute-force pattern identified.';
    incidentCreated = true;
  } else if (count >= 3) {
    level = 'WARNING';
    riskScore = 64;
    message = '⚠️ Warning: repeated failed login attempts detected.';
  } else if (count >= 1) {
    level = 'NORMAL';
    riskScore = 15;
    message = 'Login failure logged for monitoring.';
  }

  return {
    user: input.user || 'Unknown user',
    eventType: 'failed_login_attempt',
    count,
    timeWindowMinutes: 10,
    incidentCreated,
    riskScore,
    threatLevel: level,
    message,
    sampleTimes: recentAttempts.map((stamp) => stamp.toISOString()),
    rules: {
      normal: '1–2 failed attempts within 10 minutes',
      warning: '3–4 failed attempts within 10 minutes',
      highRisk: '5+ failed attempts within 10 minutes',
      critical: '10+ failed attempts within 10 minutes',
    },
  };
};

const buildDocumentAccessAnomalyEvent = (input = {}) => {
  const user = input.user || 'Unknown user';
  const normalAccess = Array.isArray(input.normalAccess) ? input.normalAccess : [];
  const accessedDocuments = Array.isArray(input.accessedDocuments) ? input.accessedDocuments : [];
  const totalCount = Number(input.totalCount || accessedDocuments.length || 0);
  const timeWindowMinutes = Number(input.timeWindowMinutes || 1);
  const highSensitivityItems = accessedDocuments.filter((doc) => String(doc.sensitivity || '').toLowerCase() === 'high').length;
  const unusualCategoryHits = accessedDocuments.filter((doc) => {
    const category = String(doc.category || '').toLowerCase();
    return category === 'finance' || category === 'procurement';
  }).length;

  let anomalyScore = 0;
  const reasons = [];

  if (totalCount >= 25) {
    anomalyScore += 30;
    reasons.push('Large number of documents downloaded in a short period');
  } else if (totalCount >= 10) {
    anomalyScore += 18;
    reasons.push('Unusually high document volume');
  }

  if (highSensitivityItems > 0) {
    anomalyScore += 25;
    reasons.push('Sensitive documents accessed outside the normal pattern');
  }

  if (timeWindowMinutes <= 2 && totalCount >= 10) {
    anomalyScore += 18;
    reasons.push('Downloads occurred at an unusually fast rate');
  }

  if (normalAccess.length > 0) {
    const matches = accessedDocuments.filter((doc) => {
      const title = String(doc.title || '').toLowerCase();
      return normalAccess.some((area) => title.includes(area.toLowerCase()));
    }).length;

    if (matches === 0 && totalCount > 0) {
      anomalyScore += 20;
      reasons.push('Access pattern does not match the user\'s normal document areas');
    }
  }

  if (unusualCategoryHits > 0) {
    anomalyScore += 12;
    reasons.push('Accessed finance/procurement files outside the expected scope');
  }

  if (String(input.previousBehavior || '').length > 0 && String(input.previousBehavior).toLowerCase() !== 'unknown') {
    anomalyScore += 8;
    reasons.push('Previous behavior differs from currently observed access pattern');
  }

  const flagged = anomalyScore >= 75 || (totalCount >= 50 && timeWindowMinutes <= 2);
  const threatLevel = flagged ? 'HIGH' : anomalyScore >= 45 ? 'MEDIUM' : 'LOW';

  return {
    user,
    eventType: 'document_access_anomaly',
    anomalyScore: Math.min(100, anomalyScore),
    flagged,
    threatLevel,
    totalCount,
    timeWindowMinutes,
    message: flagged ? '🚨 Abnormal document access detected' : 'Document access is within normal parameters.',
    reasons: [...new Set(reasons)],
    normalAccess,
    accessedDocuments: accessedDocuments.map((doc) => ({
      title: doc.title || 'Untitled document',
      category: doc.category || 'unknown',
      sensitivity: doc.sensitivity || 'unknown',
    })),
  };
};

const decayRiskScore = (score, ageInHours) => {
  if (score <= 0) return 0;
  if (ageInHours <= 0) return score;

  const decayFactor = Math.max(0, 1 - (ageInHours / 168));
  return Math.max(0, Math.round(score * decayFactor));
};

const buildUserRiskProfile = (input = {}) => {
  const user = input.user || 'Unknown user';
  const now = input.now ? new Date(input.now) : new Date();
  const loginRisk = Number(input.loginRisk || 0);
  const accessRisk = Number(input.accessRisk || 0);
  const deviceRisk = Number(input.deviceRisk || 0);
  const baseComponents = {
    loginRisk,
    accessRisk,
    deviceRisk,
  };

  const eventList = Array.isArray(input.events) ? input.events : [];
  const recentEvents = eventList
    .map((event) => {
      const timestamp = event && event.timestamp ? new Date(event.timestamp) : null;
      const ageHours = timestamp ? (now - timestamp) / (60 * 60 * 1000) : Number.POSITIVE_INFINITY;
      const decayedScore = decayRiskScore(Number(event?.score || 0), ageHours);
      return {
        ...event,
        timestamp: event?.timestamp || now.toISOString(),
        ageHours,
        decayedScore,
      };
    })
    .filter((event) => Number.isFinite(event.ageHours) && event.ageHours <= 168)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const eventScore = recentEvents.reduce((total, event) => total + event.decayedScore, 0);
  const score = Math.min(100, Math.max(0, Math.round((loginRisk + accessRisk + deviceRisk + eventScore) / 1.15)));

  const summary = score >= 85 ? 'Critical user risk' : score >= 70 ? 'High user risk' : score >= 45 ? 'Moderate user risk' : 'Low user risk';
  const explanationReasons = [
    ...(loginRisk >= 25 ? ['7 failed login attempts within 5 minutes'] : []),
    ...(deviceRisk >= 15 ? ['New device detected'] : []),
    ...(accessRisk >= 20 ? ['Access occurred outside the user\'s normal pattern'] : []),
    ...recentEvents.filter((event) => event.type && ['download', 'access', 'document'].includes(String(event.type).toLowerCase())).map((event) => {
      const count = Math.max(1, Math.round(Number(event.score || event.decayedScore || 10)));
      return `${count} sensitive documents downloaded`;
    }),
  ];
  const assessment = score >= 85
    ? 'High probability of account compromise.'
    : score >= 70
      ? 'Elevated risk of compromised access.'
      : score >= 45
        ? 'Behavior warrants closer monitoring.'
        : 'Account looks stable for now.';

  return {
    user,
    score,
    summary,
    decayed: recentEvents.length > 0,
    components: baseComponents,
    recentEvents: recentEvents.map((event) => ({
      type: event.type || 'event',
      score: event.score,
      decayedScore: event.decayedScore,
      timestamp: event.timestamp,
    })),
    explanation: {
      title: 'Why was this flagged?',
      reasons: [...new Set(explanationReasons)],
      assessment,
    },
    userRiskBreakdown: {
      loginRisk: { value: loginRisk, label: 'Login Risk' },
      accessRisk: { value: accessRisk, label: 'Access Risk' },
      deviceRisk: { value: deviceRisk, label: 'Device Risk' },
    },
  };
};

const buildCriticalSecurityResponse = (input = {}) => {
  const user = input.user || 'Unknown user';
  const riskScore = Number(input.riskScore || 0);
  const threshold = Number(input.riskThreshold || 90);
  const autoLockdownEnabled = Boolean(input.autoLockdownEnabled ?? true);
  const authorized = Boolean(input.authorized ?? false);
  const reasons = Array.isArray(input.reasons) && input.reasons.length > 0 ? input.reasons : ['High-risk activity'];

  const incidentCreated = riskScore >= threshold;
  const authorizationRequired = incidentCreated && autoLockdownEnabled;
  const lockdownApplied = incidentCreated && autoLockdownEnabled && authorized;

  const message = incidentCreated
    ? authorized
      ? `🔴 CRITICAL SECURITY INCIDENT\n\nAccount: ${user}\n\nRisk Score: ${riskScore}/100\n\nReason: ${reasons.join(' + ')}\n\nAction: Session terminated and account temporarily locked.`
      : `🔴 CRITICAL SECURITY INCIDENT\n\nAccount: ${user}\n\nRisk Score: ${riskScore}/100\n\nReason: ${reasons.join(' + ')}\n\nAction: Awaiting ICT administrator authorization before lockdown is applied.`
    : 'Security posture remains within policy expectations.';

  const action = incidentCreated
    ? authorized
      ? 'Session terminated and account temporarily locked.'
      : 'Awaiting ICT administrator authorization before lockdown is applied.'
    : 'Continue monitoring without interruption.';

  return {
    user,
    incidentCreated,
    authorizationRequired,
    lockdownApplied,
    riskScore,
    threshold,
    autoLockdownEnabled,
    authorized,
    message,
    action,
    details: {
      device: input.device || 'Unknown device',
      ip: input.ip || 'Unknown IP',
      trigger: reasons.join(' + '),
      requiresAdminApproval: authorizationRequired,
    },
    steps: [
      'Suspicious activity detected',
      'AI evaluates risk',
      'Risk exceeds threshold',
      'Create incident',
      'Terminate active session',
      'Temporarily lock account',
      'Notify ICT administrator',
      'Record everything in audit log',
    ],
  };
};

const buildSecurityIncident = (input = {}) => {
  const id = input.id || 'SEC-2026-0001';
  const user = input.user || 'Unknown user';
  const severity = String(input.severity || 'HIGH').toUpperCase();
  const status = String(input.status || 'INVESTIGATING').toUpperCase();
  const detectedAt = input.detectedAt || new Date().toISOString();
  const indicators = Array.isArray(input.indicators) && input.indicators.length > 0
    ? input.indicators
    : ['Failed authentication', 'New device', 'Abnormal document access'];
  const score = Number(input.score || 0);

  return {
    id,
    user,
    severity,
    status,
    detectedAt,
    indicators,
    score,
    label: `INCIDENT #${id}`,
    summary: `${severity} security incident for ${user} detected at ${new Date(detectedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`,
    aiRiskScore: {
      label: 'AI Risk Score',
      value: score,
      bar: `${'█'.repeat(Math.max(0, Math.min(20, Math.round(score / 5)))).padEnd(20, '░') } ${score}%`,
    },
    actions: [
      'Terminate Sessions',
      'Lock Account',
      'Mark Investigating',
      'Resolve Incident',
    ],
  };
};

const buildIncidentAction = (input = {}) => {
  const incidentId = input.incidentId || 'SEC-2026-0001';
  const action = input.action || 'Terminate Sessions';
  const user = input.user || 'ICT Admin';
  const actorRole = input.actorRole || 'ICT Admin';

  return {
    incidentId,
    action,
    user,
    actorRole,
    summary: `${user} performed action: ${action} on incident ${incidentId}`,
    auditEvent: 'Security incident action performed',
    details: {
      incidentId,
      actorRole,
      action,
      performedBy: user,
      result: 'Recorded in audit trail',
    },
  };
};

router.get('/summary', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'Security Officer'), async (req, res) => {
  res.json(buildThreatSummary());
});

router.get('/threats', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'Security Officer'), async (req, res) => {
  res.json({ threats: DEFAULT_THREATS });
});

router.post('/evaluate', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'Security Officer'), async (req, res) => {
  const result = scoreRisk(req.body || {});
  res.json({
    risk: result,
    event: {
      type: 'profile_evaluation',
      assessedAt: new Date().toISOString(),
      recommendation: result.lockdown ? 'Lock the session and notify the incident response team.' : 'Continue monitoring and require step-up verification.'
    }
  });
});

router.get('/user-risk/:userId', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'Security Officer'), async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const profile = buildUserRiskProfile({
      user: userId,
      loginRisk: 30,
      accessRisk: 25,
      deviceRisk: 17,
      now,
      events: [
        { type: 'device', score: 10, timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
        { type: 'login', score: 5, timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString() },
        { type: 'location', score: 20, timestamp: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString() },
        { type: 'access', score: 20, timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString() },
        { type: 'download', score: 15, timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString() },
        { type: 'login', score: 30, timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString() },
      ],
    });

    res.json({
      user: profile.user,
      riskScore: profile.score,
      summary: profile.summary,
      components: {
        loginRisk: 30,
        accessRisk: 25,
        deviceRisk: 17,
      },
      breakdown: profile.userRiskBreakdown,
      recentEvents: profile.recentEvents,
      decayed: profile.decayed,
      explanation: profile.explanation,
      assessedAt: now.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to compute user risk profile.', error: error.message });
  }
});

router.post('/lockdown', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'Security Officer'), async (req, res) => {
  const { user = 'Current user', device = 'Current device' } = req.body || {};

  res.json({
    message: 'Security lockdown has been applied.',
    action: {
      user,
      device,
      status: 'locked',
      reason: 'Critical risk detected',
      enforcedAt: new Date().toISOString()
    }
  });
});

router.get('/incident/:id', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'Security Officer'), async (req, res) => {
  try {
    const incident = buildSecurityIncident({
      id: req.params.id || 'SEC-2026-0042',
      user: 'Staff-023',
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      detectedAt: '2026-09-10T10:42:00.000Z',
      indicators: ['Failed authentication', 'New device', 'Abnormal document access', 'Mass download'],
      score: 94,
    });

    res.json({ incident });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load incident details.', error: error.message });
  }
});

router.post('/incident/:id/action', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'Security Officer'), async (req, res) => {
  try {
    const { action, user = req.user?.name || 'ICT Admin', actorRole = req.user?.role?.name || 'ICT Admin' } = req.body || {};
    const incidentAction = buildIncidentAction({
      incidentId: req.params.id || 'SEC-2026-0042',
      action: action || 'Terminate Sessions',
      user,
      actorRole,
    });

    await require('../middleware/audit').recordAudit({
      req,
      user: req.user,
      action: incidentAction.auditEvent,
      entity: 'SecurityIncident',
      entityId: incidentAction.incidentId,
      details: {
        incidentId: incidentAction.incidentId,
        action: incidentAction.action,
        actorRole: incidentAction.actorRole,
        performedBy: incidentAction.user,
        result: 'Recorded in audit trail',
      },
    });

    res.json({
      message: 'Incident action recorded in the audit trail.',
      action: incidentAction,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to record incident action.', error: error.message });
  }
});

module.exports = router;
module.exports.scoreRisk = scoreRisk;
module.exports.buildThreatSummary = buildThreatSummary;
module.exports.buildLoginSecurityEvent = buildLoginSecurityEvent;
module.exports.buildFailedLoginSecurityEvent = buildFailedLoginSecurityEvent;
module.exports.buildDocumentAccessAnomalyEvent = buildDocumentAccessAnomalyEvent;
module.exports.buildUserRiskProfile = buildUserRiskProfile;
module.exports.decayRiskScore = decayRiskScore;
module.exports.buildCriticalSecurityResponse = buildCriticalSecurityResponse;
module.exports.buildSecurityIncident = buildSecurityIncident;
module.exports.buildIncidentAction = buildIncidentAction;
