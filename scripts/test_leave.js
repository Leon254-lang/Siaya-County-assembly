const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
// use global fetch available in Node 18+

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const user = await User.findOne().lean();
    if (!user) {
      console.error('No users found in DB. Run seed first.');
      process.exit(1);
    }

    const secret = process.env.JWT_SECRET || 'supersecret';
    const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });

    console.log('Using user:', user.email || user._id);
    console.log('Generated token (truncated):', token.slice(0, 40) + '...');

    const payload = {
      type: 'annual',
      startDate: (() => {
        const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(0,0,0,0); return d.toISOString().split('T')[0];
      })(),
      endDate: (() => {
        const d = new Date(); d.setDate(d.getDate() + 5); d.setHours(0,0,0,0); return d.toISOString().split('T')[0];
      })(),
      reason: 'Test leave request from automated script',
      reliefStaffName: 'Test Relief',
      reliefDuties: 'Handle emails and urgent tasks'
    };

    const url = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}/api/leave`;

    console.log('Posting to', url);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    console.log('Response status:', res.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    if (err.response) {
      console.error('Server responded with', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
};

run();
