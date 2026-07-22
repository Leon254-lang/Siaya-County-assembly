import React from 'react';

export default function FormGrid({ children, className = '', ...props }) {
  return (
    <div className={`form-grid ${className}`} {...props}>
      {children}
    </div>
  );
}
