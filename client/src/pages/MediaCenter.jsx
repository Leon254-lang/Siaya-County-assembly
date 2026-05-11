import mediaItems from '../data/mediaItems';

export default function MediaCenter() {
  return (
    <div className="page media-page">
      <h1>News</h1>
      <div className="media-list">
      {mediaItems.map((item) => (
        <article key={item.slug} className="media-item">
          <a href={item.url} target="_blank" rel="noreferrer" className="media-title-link">
            <h2>{item.title}</h2>
          </a>
          <div className="media-meta">
            <span className="media-date">{item.date}</span>
            <a href={item.categoryUrl} target="_blank" rel="noreferrer" className="media-category-link">
              {item.category}
            </a>
          </div>
          <p>{item.excerpt}</p>
          <div className="media-footer">
            <a href={item.url} target="_blank" rel="noreferrer" className="button small-button media-read-more">
              READ MORE
            </a>
            <a href={item.commentUrl} target="_blank" rel="noreferrer" className="media-comment-link">
              {item.comments}
            </a>
          </div>
        </article>
      ))}
      </div>
    </div>
  );
}