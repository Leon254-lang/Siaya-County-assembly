const buildMemberQuery = ({ search = '', ward = '', party = '', committee = '', includeInactive = false }) => {
  const query = {};

  if (!includeInactive) {
    query.isActive = true;
  }

  if (ward) {
    query.ward = ward;
  }

  if (party) {
    query.party = party;
  }

  if (committee) {
    query.committeeMemberships = committee;
  }

  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { member_id: new RegExp(search, 'i') },
      { full_name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { ward: new RegExp(search, 'i') },
      { constituency: new RegExp(search, 'i') },
      { party: new RegExp(search, 'i') },
    ];
  }

  return query;
};

module.exports = { buildMemberQuery };
