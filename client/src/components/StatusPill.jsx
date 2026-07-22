import React from 'react';

const colorMap = {
  pending: 'status-pill pending',
  approved: 'status-pill approved',
  rejected: 'status-pill rejected',
  cancelled: 'status-pill cancelled',
  present: 'status-pill present',
  absent: 'status-pill absent',
  leave: 'status-pill leave',
};

export default function StatusPill({ status }) {
  const cls = colorMap[status] || 'status-pill';
  return <span className={cls}>{status}</span>;
}
