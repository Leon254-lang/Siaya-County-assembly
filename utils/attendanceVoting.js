const PRESENT_STATUSES = new Set(['Confirmed', 'Present', 'Late']);

const calculateQuorum = (attendees = [], attendance = []) => {
  const eligibleMembers = new Set((attendees || []).map((member) => String(member?._id || member)));
  const presentMembers = new Set(
    (attendance || [])
      .filter((entry) => PRESENT_STATUSES.has(entry.status))
      .map((entry) => String(entry.user?._id || entry.user))
      .filter((userId) => eligibleMembers.has(userId))
  );
  const required = Math.ceil(eligibleMembers.size / 2);

  return {
    eligible: eligibleMembers.size,
    present: presentMembers.size,
    required,
    met: required > 0 && presentMembers.size >= required,
  };
};

module.exports = { calculateQuorum, PRESENT_STATUSES };