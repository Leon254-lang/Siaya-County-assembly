import React from 'react';

export default function HRPreviewCard({ title, items, emptyMessage, renderItem, summary }) {
  return (
    <div className="hr-preview-card hr-card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <div className="hr-preview-list">
          {items.map((item) => (
            <div key={item._id} className="hr-list-item">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
      {summary ? <p className="hr-preview-summary">{summary}</p> : null}
    </div>
  );
}
