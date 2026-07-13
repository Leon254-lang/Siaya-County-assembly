import { Link, useParams } from 'react-router-dom';
import mediaItems from '../data/mediaItems';

export default function MediaPost() {
  const { slug } = useParams();
  const item = mediaItems.find((post) => post.slug === slug);

  if (!item) {
    return (
      <div className="page">
        <h1>Media not found</h1>
        <p>This item is not available. Return to the media center.</p>
        <Link to="/media" className="link-arrow">
          ← Back to Media Center
        </Link>
      </div>
    );
  }

  return (
    <div className="page media-post">
      <Link to="/media" className="link-arrow">
        ← Back to Media Center
      </Link>
      <h1>{item.title}</h1>
      <div className="media-meta">
        <span>{item.date}</span>
        <span>{item.category}</span>
      </div>
      <p>{item.excerpt}</p>
      <p>{item.content}</p>
      <div className="media-footer">
        <span>{item.comments} comments</span>
      </div>
    </div>
  );
}
