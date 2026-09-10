import { useEffect, useState } from 'react';
import api from '../services/api';

const defaultProfile = {
  failedLogins: 7,
  novelDevice: true,
  suspiciousDownload: true,
  ipMismatch: true,
  unusualAccess: true,
  geolocationMismatch: true,
};

const liveThreats = [
  { time: '12:41', label: 'Suspicious login detected', severity: 'critical' },
  { time: '12:38', label: 'Multiple failed logins', severity: 'high' },
  { time: '12:35', label: 'Unusual document download', severity: 'medium' },
  { time: '12:31', label: 'New device detected', severity: 'medium' },
];

const incidentFeed = [
  {
    id: 'INC-1042',
    severity: 'critical',
    title: 'Suspicious login detected',
    user: 'A. Mwangi',
    device: 'Windows laptop 14F',
    source: 'Authentication Gateway',
    status: 'Investigating',
    time: '12:41',
  },
  {
    id: 'INC-1038',
    severity: 'high',
    title: 'Multiple failed logins',
    user: 'J. Odhiambo',
    device: 'Android tablet',
    source: 'Identity Portal',
    status: 'Blocked',
    time: '12:38',
  },
  {
    id: 'INC-1035',
    severity: 'medium',
    title: 'Unusual document download',
    user: 'R. Njeri',
    device: 'iPhone 15',
    source: 'Document Vault',
    status: 'Reviewing',
    time: '12:35',
  },
  {
    id: 'INC-1031',
    severity: 'medium',
    title: 'New device detected',
    user: 'P. Otieno',
    device: 'Unknown MacBook',
    source: 'Access Control',
    status: 'Verified',
    time: '12:31',
  },
];

export default function SecurityCenter() {
  const [summary, setSummary] = useState({ totalThreats: 0, critical: 0, high: 0, medium: 0, active: 0, resolved: 0 });
  const [threats, setThreats] = useState([]);
  const [risk, setRisk] = useState({ score: 0, severity: 'low', lockdown: false, reasons: [] });
  const [userRisk, setUserRisk] = useState({
    riskScore: 72,
    summary: 'High user risk',
    components: { loginRisk: 30, accessRisk: 25, deviceRisk: 17 },
    breakdown: {
      loginRisk: { value: 30, label: 'Login Risk' },
      accessRisk: { value: 25, label: 'Access Risk' },
      deviceRisk: { value: 17, label: 'Device Risk' },
    },
    explanation: {
      title: 'Why was this flagged?',
      reasons: [
        '7 failed login attempts within 5 minutes',
        'New device detected',
        'Access occurred outside the user\'s normal pattern',
        '23 sensitive documents downloaded',
      ],
      assessment: 'High probability of account compromise.'
    },
  });
  const [form, setForm] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchSecurityData = async () => {
    try {
      const [summaryRes, threatsRes] = await Promise.all([
        api.get('/security/summary'),
        api.get('/security/threats')
      ]);

      setSummary(summaryRes.data || {});
      setThreats(threatsRes.data?.threats || []);

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = localStorage.getItem('userId') || storedUser?._id || storedUser?.id;

      if (userId) {
        const userRiskRes = await api.get(`/security/user-risk/${userId}`);
        const payload = userRiskRes.data || {};
        if (payload.riskScore !== undefined) {
          setUserRisk({
            riskScore: payload.riskScore,
            summary: payload.summary || 'Moderate user risk',
            components: payload.components || { loginRisk: 30, accessRisk: 25, deviceRisk: 17 },
            breakdown: payload.breakdown || {
              loginRisk: { value: 30, label: 'Login Risk' },
              accessRisk: { value: 25, label: 'Access Risk' },
              deviceRisk: { value: 17, label: 'Device Risk' },
            },
            explanation: payload.explanation || {
              title: 'Why was this flagged?',
              reasons: [
                '7 failed login attempts within 5 minutes',
                'New device detected',
                'Access occurred outside the user\'s normal pattern',
                '23 sensitive documents downloaded',
              ],
              assessment: 'High probability of account compromise.',
            },
          });
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load security data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const evaluateRisk = async () => {
    try {
      const res = await api.post('/security/evaluate', form);
      setRisk(res.data?.risk || { score: 0, severity: 'low', lockdown: false, reasons: [] });
      setMessage(res.data?.event?.recommendation || 'Risk assessment complete.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Risk evaluation failed.');
    }
  };

  const enforceLockdown = async () => {
    try {
      const res = await api.post('/security/lockdown', { user: 'Current user', device: 'Current device' });
      setMessage(res.data?.message || 'Lockdown applied.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to apply lockdown.');
    }
  };

  const alertSummary = [
    { label: 'Critical', value: summary.critical || 3, tone: 'critical' },
    { label: 'High', value: summary.high || 7, tone: 'high' },
    { label: 'Medium', value: summary.medium || 18, tone: 'medium' },
    { label: 'Normal', value: summary.normal || 246, tone: 'normal' },
  ];

  const riskTiles = [
    { label: 'Risky Users', value: 5 },
    { label: 'Risky Devices', value: 3 },
    { label: 'Blocked Sessions', value: 8 },
  ];

  const filteredIncidents = filter === 'all'
    ? incidentFeed
    : incidentFeed.filter((incident) => incident.severity === filter);

  return (
    <div className="page soc-shell">
      <div className="page-header soc-header">
        <div>
          <span className="eyebrow">AI SECURITY OPERATIONS CENTER</span>
          <h1>ICAMS AI-SOC</h1>
        </div>
        <div className="soc-actions">
          <button type="button" className="secondary-button">Generate report</button>
          <button type="button" className="primary-button">Escalate incident</button>
        </div>
      </div>

      {message && <div className="notification warning">{message}</div>}

      <div className="soc-legend">
        <span className="legend-item critical">🔴 Critical</span>
        <span className="legend-item high">🟠 High</span>
        <span className="legend-item medium">🟡 Medium</span>
        <span className="legend-item normal">🟢 Normal</span>
      </div>

      {loading ? (
        <div className="loading">Loading security signals...</div>
      ) : (
        <>
          <section className="dashboard-grid four-column soc-metrics" style={{ marginBottom: '1.5rem' }}>
            {alertSummary.map((item) => (
              <div key={item.label} className={`dashboard-card soc-stat ${item.tone}`}>
                <span className="eyebrow">{item.label}</span>
                <h3>{item.value}</h3>
              </div>
            ))}
          </section>

          <section className="dashboard-grid two-column" style={{ marginBottom: '1.5rem' }}>
            <div className="dashboard-card soc-threat-panel">
              <div className="panel-header">
                <div className="live-header">
                  <h3>Threat Activity - Live</h3>
                  <span className="pulse-dot" aria-label="live" />
                </div>
              </div>
              <ul className="soc-threat-list">
                {liveThreats.map((threat) => (
                  <li key={`${threat.time}-${threat.label}`} className={`soc-threat-item ${threat.severity}`}>
                    <span className="threat-time">{threat.time}</span>
                    <span className="threat-text">{threat.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="dashboard-card soc-risk-panel">
              <div className="panel-header">
                <h3>AI Risk Intel</h3>
              </div>
              <div className="soc-forecast">
                <div className="forecast-score">{risk.score || 76}</div>
                <div>
                  <p className="forecast-label">Current risk posture</p>
                  <strong>{risk.severity || 'high'}</strong>
                </div>
              </div>
              <div className="soc-mini-grid">
                {riskTiles.map((tile) => (
                  <div key={tile.label} className="soc-mini-card">
                    <span>{tile.label}</span>
                    <strong>{tile.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card soc-risk-panel">
              <div className="panel-header">
                <h3>USER RISK</h3>
              </div>

              <div className="soc-forecast" style={{ marginBottom: '1rem' }}>
                <div className="forecast-score">{userRisk.riskScore}</div>
                <div>
                  <p className="forecast-label">Account risk score</p>
                  <strong>{userRisk.summary}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {[
                  { key: 'loginRisk', label: 'Login Risk', value: userRisk.components.loginRisk ?? 30 },
                  { key: 'accessRisk', label: 'Access Risk', value: userRisk.components.accessRisk ?? 25 },
                  { key: 'deviceRisk', label: 'Device Risk', value: userRisk.components.deviceRisk ?? 17 },
                ].map((item) => (
                  <div key={item.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.88rem' }}>
                      <span>{item.label}</span>
                      <strong>{item.value}/100</strong>
                    </div>
                    <div style={{ width: '100%', height: '10px', borderRadius: '999px', background: '#1f2937', overflow: 'hidden' }}>
                      <div
                        style={{ width: `${Math.min(100, item.value)}%`, height: '100%', borderRadius: '999px', background: item.value >= 70 ? '#ef4444' : item.value >= 40 ? '#f59e0b' : '#22c55e' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {userRisk.explanation && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(148, 163, 184, 0.22)', display: 'grid', gap: '0.65rem' }}>
                  <strong style={{ fontSize: '0.92rem' }}>{userRisk.explanation.title || 'Why was this flagged?'}</strong>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.35rem', color: '#dbeafe' }}>
                    {(userRisk.explanation.reasons || []).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div style={{ color: '#f8fafc', fontSize: '0.9rem' }}>
                    <strong>Assessment:</strong> {userRisk.explanation.assessment || 'Elevated risk detected.'}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-card incident-panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-header incident-header">
              <h3>Live Incident Stream</h3>
              <div className="soc-filter-bar">
                {['all', 'critical', 'high', 'medium'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`filter-tab ${filter === level ? 'active' : ''}`}
                    onClick={() => setFilter(level)}
                  >
                    {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="incident-stream">
              {filteredIncidents.map((incident) => (
                <div key={incident.id} className={`incident-item ${incident.severity}`}>
                  <div className="incident-topline">
                    <div>
                      <strong>{incident.title}</strong>
                      <div className="incident-meta">{incident.time} • {incident.source}</div>
                    </div>
                    <span className={`status-tag ${incident.severity}`}>{incident.status}</span>
                  </div>
                  <div className="incident-details">
                    <span><strong>User:</strong> {incident.user}</span>
                    <span><strong>Device:</strong> {incident.device}</span>
                    <span><strong>ID:</strong> {incident.id}</span>
                  </div>
                  <div className="incident-actions">
                    <button type="button" className="secondary-button">Contain</button>
                    <button type="button" className="primary-button">Escalate</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-grid two-column" style={{ marginBottom: '1.5rem' }}>
            <div className="dashboard-card">
              <h3>AI risk scoring</h3>
              <div className="progress-bar">
                <span style={{ width: `${risk.score || 76}%` }} />
              </div>
              <p style={{ marginTop: '0.75rem' }}><strong>{risk.score || 76}</strong> / 100 — <strong>{risk.severity || 'high'}</strong></p>
              <p>{risk.lockdown ? 'Lockdown triggered.' : 'Monitoring active.'}</p>

              <div style={{ marginTop: '1rem', marginBottom: '0.75rem', padding: '0.85rem 0.9rem', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.78)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Why was this flagged?</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.35rem' }}>
                  {(risk.reasons || ['Repeated failed logins detected', 'New device on untrusted network', 'IP mismatch detected']).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div style={{ marginTop: '0.65rem', fontWeight: 600 }}>
                  Assessment: {risk.assessment || (risk.score >= 85 ? 'High probability of account compromise.' : 'Elevated risk detected.')}
                </div>
              </div>

              <div className="button-row">
                <button type="button" className="primary-button" onClick={evaluateRisk}>Evaluate risk</button>
                {risk.lockdown && (
                  <button type="button" className="secondary-button" onClick={enforceLockdown}>Lock account</button>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <h3>Security signal inputs</h3>
              <div className="form-grid">
                <label>
                  Failed logins
                  <input type="number" min="0" max="20" value={form.failedLogins} onChange={(event) => setForm({ ...form, failedLogins: Number(event.target.value) || 0 })} />
                </label>
                <label>
                  Novel device
                  <select value={String(form.novelDevice)} onChange={(event) => setForm({ ...form, novelDevice: event.target.value === 'true' })}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label>
                  Suspicious download
                  <select value={String(form.suspiciousDownload)} onChange={(event) => setForm({ ...form, suspiciousDownload: event.target.value === 'true' })}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label>
                  IP mismatch
                  <select value={String(form.ipMismatch)} onChange={(event) => setForm({ ...form, ipMismatch: event.target.value === 'true' })}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label>
                  Unusual access pattern
                  <select value={String(form.unusualAccess)} onChange={(event) => setForm({ ...form, unusualAccess: event.target.value === 'true' })}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label>
                  Geolocation mismatch
                  <select value={String(form.geolocationMismatch)} onChange={(event) => setForm({ ...form, geolocationMismatch: event.target.value === 'true' })}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <h3>Threat activity</h3>
            {threats.length === 0 ? (
              <p>No active threats detected.</p>
            ) : (
              <div className="stacked-list">
                {threats.map((threat) => (
                  <div key={threat.id} className="feedback-item">
                    <div className="feedback-head">
                      <strong>{threat.title}</strong>
                      <small>{threat.severity?.toUpperCase()}</small>
                    </div>
                    <p><strong>User:</strong> {threat.user}</p>
                    <p><strong>Device:</strong> {threat.device}</p>
                    <p><strong>Location:</strong> {threat.location}</p>
                    <p><strong>Score:</strong> {threat.score}</p>
                    <p><strong>Status:</strong> {threat.status}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
