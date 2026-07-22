import React from 'react';

export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const classes = [
    'btn',
    variant === 'secondary'
      ? 'btn-secondary'
      : variant === 'tertiary'
      ? 'btn-tertiary'
      : variant === 'danger'
      ? 'btn-danger'
      : 'btn-primary',
  ];
  if (className) classes.push(className);
  return (
    <button className={classes.join(' ')} {...props}>
      {children}
    </button>
  );
}
