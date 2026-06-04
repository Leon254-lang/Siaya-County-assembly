import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

export default function Voting() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('bills');
  const [bills, setBills] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedKind, setSelectedKind] = useState('bill');
  const [voteForm, setVoteForm] = useState({ question: '', voteType: 'electronic', options: '' });
  const [castVote, setCastVote] = useState({ itemId: '', option: '' });

  const loadResources = async () => {
    setLoading(true);
    try {
      const [billsRes, meetingsRes] = await Promise.all([
        api.get('/bills'),
        api.get('/meetings'),
      ]);
      setBills(billsRes.data);
      setMeetings(meetingsRes.data);
    } catch (err) {
      console.error('Failed to load voting resources:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('icamsToken');
        navigate('/login');
        return;
      }
      setMessage('Unable to load voting resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('icamsToken')) {
      navigate('/login');
      return;
    }
    loadResources();
  }, [navigate]);

  const refreshSelectedItem = async (kind, id) => {
    try {
      const path = kind === 'bill' ? `/bills/${id}/voting-summary` : `/meetings/${id}/voting-summary`;
      const res = await api.get(path);
      setSelectedSummary({ ...res.data, _id: id });
      setSelectedKind(kind);
      setCastVote({ itemId: '', option: '' });
    } catch (err) {
      console.error('Failed to load selected item summary:', err);
      setMessage('Unable to load selected voting item.');
    }
  };

  const handleSelect = (kind, item) => {
    setSelectedKind(kind);
    setSelectedItem(item);
    setSelectedSummary(null);
    setCastVote({ itemId: '', option: '' });
    refreshSelectedItem(kind, item._id);
  };

  const getVoteItems = () => {
    if (selectedSummary?.summary) return selectedSummary.summary;
    if (!selectedItem) return [];
    return selectedKind === 'bill' ? selectedItem.voting?.items || [] : selectedItem.votingItems || [];
  };

  const handleVoteFormChange = (event) => {
    const { name, value } = event.target;
    setVoteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setSelectedItem(null);
    setSelectedSummary(null);
    setCastVote({ itemId: '', option: '' });
    setMessage('');
  };

  const handleAddVotingItem = async (event) => {
    event.preventDefault();
    if (!selectedItem) {
      setMessage('Select a bill or meeting first.');
      return;
    }
    const options = voteForm.options.split(',').map((o) => o.trim()).filter(Boolean);
    if (!voteForm.question || options.length === 0) {
      setMessage('Enter a question and at least one option separated by commas.');
      return;
    }

    try {
      const path = selectedKind === 'bill' ? `/bills/${selectedItem._id}/vote-item` : `/meetings/${selectedItem._id}/voting-item`;
      const payload = { question: voteForm.question, voteType: voteForm.voteType, options };
      await api.post(path, payload);
      setMessage('Voting item created successfully.');
      setVoteForm({ question: '', voteType: 'electronic', options: '' });
      await loadResources();
      await refreshSelectedItem(selectedKind, selectedItem._id);
    } catch (err) {
      console.error('Failed to add voting item:', err);
      setMessage(err.response?.data?.message || 'Unable to add voting item.');
    }
  };

  const handleCastVote = async (event) => {
    event.preventDefault();
    if (!selectedItem || !castVote.itemId || !castVote.option) {
      setMessage('Choose a voting item and an option before casting a vote.');
      return;
    }

    const voteItems = getVoteItems();
    const selectedVoteItem = voteItems.find((item) => item._id === castVote.itemId || item.question === castVote.itemId);
    const itemId = selectedVoteItem?._id || castVote.itemId;

    if (!itemId) {
      setMessage('Unable to resolve the selected voting item.');
      return;
    }

    try {
      const path = selectedKind === 'bill' ? `/bills/${selectedItem._id}/vote` : `/meetings/${selectedItem._id}/vote`;
      await api.post(path, { itemId, option: castVote.option });
      setMessage('Vote cast successfully.');
      setCastVote({ itemId: '', option: '' });
      await loadResources();
      await refreshSelectedItem(selectedKind, selectedItem._id);
    } catch (err) {
      console.error('Failed to cast vote:', err);
      setMessage(err.response?.data?.message || 'Unable to submit vote.');
    }
  };

  const visibleBills = bills.filter((bill) => bill.voting?.items?.length > 0);
  const visibleMeetings = meetings.filter((meeting) => meeting.votingItems?.length > 0);

  return (
    <div className="voting-page">
      <div className="page-header">
        <h1>Voting Management</h1>
        <p>Track vote items for bills and meetings, create new vote questions, and cast votes with decision summaries.</p>
      </div>

      {message && <div className="notification">{message}</div>}

      <div className="tab-controls">
        <button type="button" className={tab === 'bills' ? 'active' : ''} onClick={() => handleTabChange('bills')}>Bill votes</button>
        <button type="button" className={tab === 'meetings' ? 'active' : ''} onClick={() => handleTabChange('meetings')}>Meeting votes</button>
      </div>

      <div className="voting-grid">
        <section className="voting-list">
          <h2>{tab === 'bills' ? 'Bills with Voting' : 'Meetings with Voting'}</h2>
          {loading ? (
            <p>Loading resources...</p>
          ) : (tab === 'bills' ? visibleBills : visibleMeetings).length === 0 ? (
            <p>No items with voting data found.</p>
          ) : (
            <ul>
              {(tab === 'bills' ? visibleBills : visibleMeetings).map((item) => (
                <li key={item._id}>
                  <button type="button" className={selectedItem?._id === item._id ? 'selected' : ''} onClick={() => handleSelect(tab === 'bills' ? 'bill' : 'meeting', item)}>
                    {tab === 'bills' ? item.title : item.title} {tab === 'meetings' ? `(${formatDate(item.startTime)})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="voting-details">
          {!selectedItem ? (
            <p>Select a bill or meeting to view voting details.</p>
          ) : (
            <>
                      <div className="selected-summary">
                <h2>{selectedSummary?.title || selectedItem?.title}</h2>
                <p><strong>Type:</strong> {selectedKind === 'bill' ? 'Bill' : 'Meeting'}</p>
                {selectedKind === 'meeting' && <p><strong>Scheduled:</strong> {formatDate(selectedSummary?.startTime || selectedItem?.startTime)}</p>}
                {selectedKind === 'bill' && <p><strong>Status:</strong> {selectedSummary?.status || selectedItem?.status}</p>}
              </div>

                      <div className="vote-items">
                {getVoteItems().map((item) => (
                  <div key={item._id || item.question} className="vote-item-card">
                    <div className="vote-item-header">
                      <h3>{item.question}</h3>
                      <span className="badge">{item.voteType || 'electronic'}</span>
                    </div>
                    {item.description && <p>{item.description}</p>}
                    <div className="vote-results">
                      <p><strong>Final decision:</strong> {item.finalDecision || 'Pending'}</p>
                      <p><strong>Total votes:</strong> {item.totalVotes ?? (item.results?.reduce((sum, result) => sum + (result.votes || 0), 0) || 0)}</p>
                      <ul>
                        {(item.results || []).map((result) => (
                          <li key={result.option}>{result.option}: {result.votes} votes</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <form className="vote-form" onSubmit={handleAddVotingItem}>
                <h3>Create new vote item</h3>
                <label>
                  Question
                  <input name="question" value={voteForm.question} onChange={handleVoteFormChange} placeholder="E.g. Approve budget report" />
                </label>
                <label>
                  Vote type
                  <select name="voteType" value={voteForm.voteType} onChange={handleVoteFormChange}>
                    <option value="electronic">Electronic</option>
                    <option value="voice">Voice</option>
                    <option value="secret">Secret</option>
                  </select>
                </label>
                <label>
                  Options (comma separated)
                  <input name="options" value={voteForm.options} onChange={handleVoteFormChange} placeholder="Yes, No, Abstain" />
                </label>
                <button type="submit">Add voting item</button>
              </form>

              <form className="vote-form" onSubmit={handleCastVote}>
                <h3>Cast vote</h3>
                <label>
                  Voting item
                  <select value={castVote.itemId} onChange={(e) => setCastVote((prev) => ({ ...prev, itemId: e.target.value }))}>
                    <option value="">Select item</option>
                    {getVoteItems().map((item) => (
                      <option key={item._id || item.question} value={item._id || item.question}>{item.question}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Option
                  <select value={castVote.option} onChange={(e) => setCastVote((prev) => ({ ...prev, option: e.target.value }))}>
                    <option value="">Select option</option>
                      {(() => {
                      const selectedVoteItem = getVoteItems().find((item) => item._id === castVote.itemId || item.question === castVote.itemId);
                      return selectedVoteItem?.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      )) || selectedVoteItem?.results?.map((result) => (
                        <option key={result.option} value={result.option}>{result.option}</option>
                      ));
                    })()}
                  </select>
                </label>
                <button type="submit">Submit vote</button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
