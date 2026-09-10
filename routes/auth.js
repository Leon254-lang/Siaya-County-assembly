const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { buildLoginSecurityEvent, buildFailedLoginSecurityEvent } = require('./security');
const { sendReminder } = require('../utils/mailer');

const router = express.Router();

const getAppBaseUrl = (req = null) => {
  const configured = process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.APP_URL || process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (req?.headers) {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto || req.protocol || 'https';
    const host = req.headers.host;
    if (host) {
      return `${protocol}://${host}`.replace(/\/$/, '');
    }
  }

  return process.env.NODE_ENV === 'production' ? 'https://localhost' : 'http://localhost:5173';
};

const buildVerificationUrl = (token, req = null) => `${getAppBaseUrl(req)}/verify-email?token=${encodeURIComponent(token)}`;

const createVerificationToken = () => crypto.randomBytes(32).toString('hex');

const getClientIp = (req = null) => {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }

  return req?.ip || 'Unknown';
};

const getDeviceName = (req = null) => {
  const userAgent = String(req?.headers?.['user-agent'] || '').toLowerCase();

  if (userAgent.includes('chrome')) return 'Chrome';
  if (userAgent.includes('firefox')) return 'Firefox';
  if (userAgent.includes('safari')) return 'Safari';
  if (userAgent.includes('edge')) return 'Edge';
  if (userAgent.includes('mobile')) return 'Mobile Browser';
  return 'Unknown device';
};

const sendVerificationEmail = async (user, token, req = null) => {
  const verificationUrl = buildVerificationUrl(token, req);
  const subject = 'Verify your email address';
  const text = `Hello ${user.name || 'there'},\n\nPlease verify your email address by opening this link:\n${verificationUrl}\n\nIf you did not create this account, you can safely ignore this email.`;
  const html = `<p>Hello ${user.name || 'there'},</p><p>Please verify your email address by clicking the button below.</p><p><a href="${verificationUrl}" target="_blank" rel="noopener noreferrer">Verify Email</a></p><p>If you did not create this account, you can safely ignore this email.</p>`;

  const mailResult = await sendReminder({
    to: user.email,
    subject,
    text,
    html,
  });

  return { verificationUrl, mailResult };
};

router.post('/register', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'HR Officer'), async (req, res) => {
  try {
    const { name, email, password, roleName, phone, department } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const userRole = req.user.role?.name;
    if (roleName === 'MCA' && !userRole?.includes('Admin')) {
      return res.status(403).json({ message: 'Only admins can create MCA accounts.' });
    }
    if (roleName === 'Intern' && !['Super Admin', 'HR Officer'].includes(userRole)) {
      return res.status(403).json({ message: 'Only Super Admin and HR Officer can create Intern accounts.' });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ message: 'Password required.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    const role = await Role.findOne({ name: roleName || 'Clerk' });
    if (!role) {
      return res.status(400).json({ message: 'Select a valid role.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = createVerificationToken();
    const isInternAutoVerified = roleName === 'Intern' && ['Super Admin', 'HR Officer'].includes(userRole);
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashed,
      role: role._id,
      phone,
      department,
      isEmailVerified: isInternAutoVerified,
      verifiedAt: isInternAutoVerified ? new Date() : undefined,
      emailVerificationToken: isInternAutoVerified ? null : verificationToken,
      emailVerificationExpiresAt: isInternAutoVerified ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await user.save();

    const created = await User.findById(user._id).populate('role department');

    if (isInternAutoVerified) {
      res.status(201).json({
        message: 'Intern user created and verified. The intern can log in immediately.',
        user: created,
      });
    } else {
      const verification = await sendVerificationEmail(created, verificationToken, req);
      res.status(201).json({
        message: 'User created. A verification email has been sent. The user will not be able to log in until the email is verified.',
        user: created,
        verificationUrl: verification.verificationUrl,
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).populate('role');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const now = new Date();
      const history = Array.isArray(user.failedLoginHistory) ? user.failedLoginHistory : [];
      const recentFailures = history.filter((stamp) => now - new Date(stamp) <= 10 * 60 * 1000);
      recentFailures.push(now);
      user.failedLoginHistory = recentFailures;
      user.failedLoginAttempts = recentFailures.length;
      await user.save();

      const securityIncident = buildFailedLoginSecurityEvent({
        user: user.name,
        recentFailureTimestamps: recentFailures,
      });

      await recordAudit({
        req,
        user,
        action: 'Failed login attempt',
        entity: 'SecurityEvent',
        entityId: user._id,
        details: {
          eventType: securityIncident.eventType,
          incidentCreated: securityIncident.incidentCreated,
          riskScore: securityIncident.riskScore,
          threatLevel: securityIncident.threatLevel,
          count: securityIncident.count,
          timeWindowMinutes: securityIncident.timeWindowMinutes,
        },
      });

      return res.status(401).json({
        message: 'Invalid credentials.',
        securityIncident,
      });
    }

    if (user.isEmailVerified === false) {
      if (!user.emailVerificationToken) {
        const verificationToken = createVerificationToken();
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();
      }

      const verificationUrl = buildVerificationUrl(user.emailVerificationToken, req);
      return res.status(403).json({
        message: 'Please verify your email before logging in. Use the verification link below if the email is not delivered.',
        requiresVerification: true,
        verificationUrl,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecret', {
      expiresIn: '8h',
    });

    const clientIp = getClientIp(req);
    const device = getDeviceName(req);
    const currentLocation = 'Unknown';
    const securityEvent = buildLoginSecurityEvent({
      user: {
        name: user.name,
        lastLoginLocation: user.lastLoginLocation,
        lastLoginDevice: user.lastLoginDevice,
        lastLoginIp: user.lastLoginIp,
        failedLoginAttempts: user.failedLoginAttempts,
      },
      currentIp: clientIp,
      device,
      location: currentLocation,
      previousLogin: user.lastLoginLocation || 'Unknown',
      currentLogin: currentLocation,
      failedAttempts: Number(user.failedLoginAttempts || 0),
    });

    user.lastLoginAt = new Date();
    user.lastLoginIp = clientIp;
    user.lastLoginDevice = device;
    user.lastLoginLocation = currentLocation;
    user.failedLoginAttempts = 0;
    await user.save();

    await recordAudit({
      req,
      user,
      action: 'User login',
      entity: 'User',
      entityId: user._id,
      details: {
        loginTime: new Date().toISOString(),
        ip: clientIp,
        device,
        securityEvent,
      },
    });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role.name },
      securityEvent,
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(404).json({ message: 'Verification link is invalid or has expired.' });
    }

    if (user.isEmailVerified) {
      return res.json({ verified: true, message: 'Email already verified. You can sign in now.' });
    }

    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      return res.status(410).json({ message: 'Verification link has expired. Please request a new verification email.' });
    }

    user.isEmailVerified = true;
    user.verifiedAt = new Date();
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.json({ verified: true, message: 'Email verified successfully. You can now sign in.' });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed.', error: error.message });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isEmailVerified) {
      return res.json({ message: 'Email is already verified.' });
    }

    const verificationToken = createVerificationToken();
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user, verificationToken, req);

    return res.json({ message: 'A new verification email has been sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Could not resend verification email.', error: error.message });
  }
});

router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
