import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const defaultIncident = {
  id: 'SEC-2026-0042',
  user: 'Staff-023',
  severity: 'CRITICAL',
  status: 'INVESTIGATING',
  detectedAt: '2026-09-10T10:42:00.000Z',
  indicators: ['Failed authentication', 'New device', 'Abnormal document access', 'Mass download'],
  score: 94,
  actions: ['Terminate Sessions', 'Lock Account', 'Mark Investigating', 'Resolve Incident'],
};

export default function IncidentDetails() {
  const { id } = useParams();
  const [incident, setIncident] = useState(defaultIncident);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadIncident = async () => {
      try {
        const response = await api.get(`/security/incident/${id || defaultIncident.id}`);
        setIncident(response.data?.incident || defaultIncident);
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load incident details.');
      } finally {
        setLoading(false);
      }
    };

    loadIncident();
  }, [id]);

  const handleAction = async (actionName) => {
    try {
      setSubmitting(true);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await api.post(`/security/incident/${incident.id}/action`, {
        action: actionName,
        user: currentUser?.name || 'ICT Admin',
        actorRole: currentUser?.role || 'ICT Admin',
      });

      setMessage(response.data?.message || 'Incident action recorded.');
      if (actionName === 'Mark Investigating') {
        setIncident((prev) => ({ ...prev, status: 'INVESTIGATING' }));
      }
      if (actionName === 'Resolve Incident') {
        setIncident((prev) => ({ ...prev, status: 'RESOLVED' }));
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to record incident action.');
    } finally {
      setSubmitting(false);
    }
  };

  const detectedDate = incident.detectedAt ? new Date(incident.detectedAt) : new Date();

  return (
    <div className="page-content" style={{ maxWidth: '920px', margin: '0 auto', padding: '2rem 1rem 3rem' }}>
      <div style={{ background: '#111827', color: '#fff', borderRadius: '18px', padding: '2rem', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.82rem', letterSpacing: '0.12em', fontWeight: 700 }}>INCIDENT #{incident.id}</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: '2rem' }}>Security incident</h1>
          </div>
          <span
            style={{
              background: incident.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
              color: '#fff',
              borderRadius: '999px',
              padding: '0.5rem 0.9rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              fontSize: '0.78rem',
            }}
          >
            {incident.severity}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(148, 163, 184, 0.08)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>Severity</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{incident.severity}</div>
          </div>
          <div style={{ background: 'rgba(148, 163, 184, 0.08)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>Status</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{incident.status}</div>
          </div>
          <div style={{ background: 'rgba(148, 163, 184, 0.08)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>User</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{incident.user}</div>
          </div>
          <div style={{ background: 'rgba(148, 163, 184, 0.08)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>Detected</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{detectedDate.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '0.9rem' }}>Indicators:</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.5rem', color: '#e5e7eb' }}>
            {incident.indicators.map((indicator) => (
              <li key={indicator}><span style={{ color: '#4ade80', marginRight: '0.5rem' }}>✓</span>{indicator}</li>
            ))}
          </ul>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '0.8rem' }}>AI Risk Score</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px', background: '#1f2937', borderRadius: '999px', overflow: 'hidden', height: '18px', border: '1px solid rgba(148,163,184,0.3)' }}>
              <div
                style={{
                  width: `${incident.score}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #22c55e 0%, #facc15 45%, #ef4444 100%)',
                }}
              />
            </div>
            <strong style={{ fontSize: '1.35rem' }}>{incident.score}%</strong>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.9rem' }}>Actions:</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {incident.actions.map((actionName) => (
              <button
                key={actionName}
                type="button"
                disabled={submitting}
                onClick={() => handleAction(actionName)}
                style={{
                  background: actionName === 'Resolve Incident' ? '#10b981' : '#e2e8f0',
                  color: actionName === 'Resolve Incident' ? '#03130e' : '#0f172a',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.8rem 1rem',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.8 : 1,
                }}
              >
                {actionName}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div style={{ background: '#0f172a', color: '#bfdbfe', border: '1px solid rgba(96,165,250,0.5)', borderRadius: '12px', padding: '0.9rem 1rem', marginTop: '1rem' }}>
            {message}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>Loading incident details...</div>
      )}
    </div>
  );
}
