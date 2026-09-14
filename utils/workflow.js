const buildWorkflowEvent = ({ actor, action, status, comment = '', nextResponsibleOfficer = null }) => ({
  actor,
  action,
  status,
  comment,
  nextResponsibleOfficer,
  at: new Date(),
});

module.exports = { buildWorkflowEvent };