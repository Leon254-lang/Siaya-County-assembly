import { useEffect, useState } from 'react';
import api from '../services/api';

const workflowSteps = [
  'Upload Document',
  'Extract text',
  'AI processes document',
  'Classify document',
  'Create embeddings',
  'Add to knowledge base',
  'AI becomes able to answer questions'
];

export default function AiTrainingCenter() {
  const [summary, setSummary] = useState({
    documents: 1247,
    processed: 1239,
    pending: 8,
    knowledgeChunks: 48392,
    lastUpdatedLabel: '10 Sep 2026',
    accuracy: 87,
    questionsToday: 342,
    unansweredQuestions: 12
  });
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    question: '',
    answer: '',
    outcome: 'correct',
    correctedAnswer: '',
    notes: ''
  });
  const [statusMessage, setStatusMessage] = useState('');

  const loadAdminData = async () => {
    try {
      const [summaryRes, feedbackRes] = await Promise.all([
        api.get('/ai-knowledge/summary'),
        api.get('/ai-knowledge/feedback')
      ]);

      setSummary(summaryRes.data || {});
      setFeedback(feedbackRes.data?.feedback || []);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to load the AI training center data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/ai-knowledge/feedback', form);
      setStatusMessage('Feedback saved. The training loop has been updated.');
      setForm({ question: '', answer: '', outcome: 'correct', correctedAnswer: '', notes: '' });
      await loadAdminData();
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to save feedback.');
    }
  };

  const accuracyWidth = `${Math.max(0, Math.min(100, Number(summary.accuracy || 87)))}%`;

  return (
    <div className="page">
      <div className="page-header">
        <h1>AI Admin Training Center</h1>
        <p>Govern the ICAMS knowledge base, track AI quality, and improve answer quality with admin feedback.</p>
      </div>

      {statusMessage && <div className="notification success">{statusMessage}</div>}

      {loading ? (
        <div className="loading">Loading training data...</div>
      ) : (
        <>
          <section className="dashboard-grid three-column" style={{ marginBottom: '1.5rem' }}>
            <div className="dashboard-card">
              <span className="eyebrow">Documents</span>
              <h3>{summary.documents?.toLocaleString() || 0}</h3>
            </div>
            <div className="dashboard-card">
              <span className="eyebrow">Processed</span>
              <h3>{summary.processed?.toLocaleString() || 0}</h3>
            </div>
            <div className="dashboard-card">
              <span className="eyebrow">Pending</span>
              <h3>{summary.pending?.toLocaleString() || 0}</h3>
            </div>
            <div className="dashboard-card">
              <span className="eyebrow">Knowledge chunks</span>
              <h3>{summary.knowledgeChunks?.toLocaleString() || 0}</h3>
            </div>
            <div className="dashboard-card">
              <span className="eyebrow">Last updated</span>
              <h3>{summary.lastUpdatedLabel || 'N/A'}</h3>
            </div>
            <div className="dashboard-card">
              <span className="eyebrow">Questions today</span>
              <h3>{summary.questionsToday?.toLocaleString() || 0}</h3>
            </div>
          </section>

          <section className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
            <h3>AI Accuracy Feedback</h3>
            <div className="progress-bar" aria-label="AI accuracy">
              <span style={{ width: accuracyWidth }} />
            </div>
            <p style={{ marginTop: '0.75rem' }}><strong>{summary.accuracy || 0}%</strong> correct answers across the training pipeline.</p>
            <div className="dashboard-grid two-column">
              <div>
                <label>Unanswered questions</label>
                <strong>{summary.unansweredQuestions || 0}</strong>
              </div>
              <div>
                <label>Processed ratio</label>
                <strong>{summary.processedRatio || 0}%</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-grid two-column" style={{ marginBottom: '1.5rem' }}>
            <div className="dashboard-card">
              <h3>AI Knowledge Management</h3>
              <div className="stacked-list">
                {workflowSteps.map((step, index) => (
                  <div key={step} className="workflow-step">
                    <span>{index + 1}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <h3>Flag poor AI answer</h3>
              <form onSubmit={handleSubmit} className="form-grid">
                <label>
                  Question
                  <textarea value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} rows={3} required />
                </label>
                <label>
                  AI answer
                  <textarea value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} rows={3} required />
                </label>
                <label>
                  Outcome
                  <select value={form.outcome} onChange={(event) => setForm({ ...form, outcome: event.target.value })}>
                    <option value="correct">👍 Correct</option>
                    <option value="incorrect">👎 Incorrect</option>
                  </select>
                </label>
                {form.outcome === 'incorrect' && (
                  <label>
                    Correct answer
                    <textarea value={form.correctedAnswer} onChange={(event) => setForm({ ...form, correctedAnswer: event.target.value })} rows={3} placeholder="Add the correct response for retraining." />
                  </label>
                )}
                <label>
                  Notes
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} placeholder="Optional context for retraining and audit." />
                </label>
                <button type="submit" className="primary-button">Save feedback</button>
              </form>
            </div>
          </section>

          <section className="dashboard-card">
            <h3>Recent feedback</h3>
            {feedback.length === 0 ? (
              <p>No feedback records yet.</p>
            ) : (
              <div className="stacked-list">
                {feedback.map((item) => (
                  <div key={item.id || `${item.question}-${item.createdAt}`} className="feedback-item">
                    <div className="feedback-head">
                      <strong>{item.outcome === 'correct' ? '👍 Correct' : '👎 Incorrect'}</strong>
                      <small>{new Date(item.createdAt).toLocaleString('en-KE')}</small>
                    </div>
                    <p><strong>Question:</strong> {item.question}</p>
                    <p><strong>Answer:</strong> {item.answer}</p>
                    {item.correctedAnswer && <p><strong>Correct answer:</strong> {item.correctedAnswer}</p>}
                    {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
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
