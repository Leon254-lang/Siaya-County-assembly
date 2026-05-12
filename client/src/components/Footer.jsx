export default function Footer() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '1rem',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
      marginTop: 'auto'
    }}>
      <p>&copy; 2024 Siaya County Assembly. All rights reserved.</p>
      <p>Contact: info@siaya.go.ke | Phone: +254 123 456 789</p>
    </footer>
  );
}