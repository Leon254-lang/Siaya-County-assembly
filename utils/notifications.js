const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendReminder } = require('./mailer');
const { sendSms } = require('./sms');

const preferenceKeyByType = {
  meeting_reminder: 'meetingReminders',
  approval_request: 'approvalRequests',
  deadline: 'deadlines',
  status_update: 'statusUpdates',
  public_notice: 'publicNotices',
  system: 'statusUpdates',
};

const notifyUsers = async ({ userIds = [], type = 'system', title, body, link, critical = false }) => {
  const ids = [...new Set(userIds.filter(Boolean).map((id) => String(id)))];
  if (!ids.length) return [];

  const users = await User.find({ _id: { $in: ids }, isActive: { $ne: false } }).select('name email phone notificationPreferences');
  const notifications = [];
  for (const user of users) {
    const preferences = user.notificationPreferences || {};
    const preferenceKey = preferenceKeyByType[type];
    const enabled = critical || preferences[preferenceKey] !== false;
    if (!enabled) continue;

    const notification = await Notification.create({ recipient: user._id, type, title, body, link, critical });
    notifications.push(notification);

    if (critical || preferences.email !== false) {
      try {
        await sendReminder({ to: user.email, subject: title, text: body, html: `<p>${body}</p>` });
        notification.emailSentAt = new Date();
      } catch (error) {
        console.error('Notification email failed:', error.message);
      }
    }

    if ((critical || preferences.sms === true) && user.phone && process.env.SMS_WEBHOOK_URL) {
      try {
        if (await sendSms({ to: user.phone, body: `${title}: ${body}` })) notification.smsSentAt = new Date();
      } catch (error) {
        console.error('Notification SMS failed:', error.message);
      }
    }
    await notification.save();
  }
  return notifications;
};

module.exports = { notifyUsers };
module.exports.safeNotify = async (payload) => {
  try {
    return await notifyUsers(payload);
  } catch (error) {
    console.error('Notification delivery failed:', error.message);
    return [];
  }
};