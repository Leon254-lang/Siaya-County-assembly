import React from 'react';

export default function DataTable({ columns = [], data = [], children, className = '' }) {
  return (
    <div className={`data-table-wrapper ${className}`}>
      {children || (
        <table className="file-table">
          <thead>
            <tr>{columns.map((c, idx) => <th key={idx}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((row, rIdx) => (
              <tr key={row._id || rIdx}>
                {columns.map((c, cIdx) => <td key={cIdx}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
