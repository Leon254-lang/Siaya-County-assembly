const sendSms = async ({ to, body }) => {
  if (!process.env.SMS_WEBHOOK_URL || !to) {
    return false;
  }

  const response = await fetch(process.env.SMS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, body }),
  });
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  return true;
};

module.exports = { sendSms };