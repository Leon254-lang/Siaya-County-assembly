const productLinks = [
  { label: 'Dashboard', url: '/dashboard' },
  { label: 'Documents', url: '/documents' },
  { label: 'Meetings', url: '/meetings' },
];

const countyLinks = [
  { label: 'About Assembly', url: '/leaders' },
  { label: 'Committees', url: '/committees' },
  { label: 'Public Feedback', url: '/feedback' },
];

const connectLinks = [
  { label: 'Facebook', url: 'https://www.facebook.com/siayaassembly' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/company/siaya-county-assembly' },
];

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <img
            src="/uploads/siayalogo.jpeg"
            alt="Siaya County Assembly Logo"
            style={{ height: '56px', width: 'auto', marginRight: '12px', objectFit: 'contain' }}
          />
          <div>
            <h3>Siaya County Assembly</h3>
            <p>
              A secure county assembly platform for meetings, documents, attendance,
              visitors, procurement and public engagement built for transparency
              and efficient governance.
            </p>
          </div>
        </div>

        <div className="footer-links-grid">
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              {productLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h4>County</h4>
            <ul>
              {countyLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              {connectLinks.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="social-link">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2024 Siaya County Assembly. All rights reserved.</p>
        <p>
          <a href="/privacy">Privacy Policy</a>
          <span>•</span>
          <a href="/terms">Terms of Service</a>
        </p>
      </div>
    </footer>
  );
}