import mediaItems from '../data/mediaItems';

const quickLinks = [
  { label: 'Dashboard', url: '/dashboard' },
  { label: 'Know Your Leaders', url: '/leaders' },
  { label: 'Documents', url: '/documents' },
  { label: 'Public Feedback', url: '/feedback' },
];

const importantLinks = [
  { label: 'Siaya Assembly Official Website', url: 'https://siayaassembly.go.ke/' },
  { label: 'Speaker’s Office', url: 'https://siayaassembly.go.ke/the-speakers-office/' },
  { label: 'Contact Us', url: 'https://siayaassembly.go.ke/contact-us/' },
  { label: 'Procurement', url: 'https://siayaassembly.go.ke/procurement/' },
];

const recentPosts = mediaItems.slice(0, 3);

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-grid">
        <div className="footer-section">
          <h4>About Us</h4>
          <p>
            Siaya County Assembly management system provides secure access to documents,
            meetings, attendance, visitors, assets, and public feedback in one convenient portal.
          </p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            {quickLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-section">
          <h4>Important Links</h4>
          <ul>
            {importantLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-section">
          <h4>Recent Posts</h4>
          <ul>
            {recentPosts.map((post) => (
              <li key={post.slug}>
                <a href={post.url} target="_blank" rel="noreferrer">
                  {post.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 Siaya County Assembly. All rights reserved.</p>
        <p>Contact: clerk@siayaassembly.go.ke | Phone: 057 5321021</p>
      </div>
    </footer>
  );
}