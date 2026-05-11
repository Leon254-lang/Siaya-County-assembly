import { useEffect, useState } from 'react';
import api from '../services/api';

const defaultForm = {
  title: '',
  description: '',
  department: '',
  priority: 'medium',
};

const defaultUpdate = {
  assignedTo: '',
  status: 'open',
  resolutionNotes: '',
};

const defaultComment = {
  message: '',
};

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [updateForm, setUpdateForm] = useState(defaultUpdate);
  const [commentForm, setCommentForm] = useState(defaultComment);
  const [message, setMessage] = useState('');

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to load tickets', error);
      setMessage('Unable to load tickets.');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to load departments', error);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      setUpdateForm({
        assignedTo: selectedTicket.assignedTo?._id || '',
        status: selectedTicket.status || 'open',
        resolutionNotes: selectedTicket.resolutionNotes || '',
      });
      setCommentForm(defaultComment);
    }
  }, [selectedTicket]);

  const resetForm = () => {
    setForm(defaultForm);
    setMessage('');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateChange = (event) => {
    const { name, value } = event.target;
    setUpdateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCommentChange = (event) => {
    const { name, value } = event.target;
    setCommentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        department: form.department || undefined,
        priority: form.priority,
      };

      const response = await api.post('/tickets', payload);
      setTickets((prev) => [response.data, ...prev]);
      setSelectedTicket(response.data);
      resetForm();
      setMessage('Issue submitted successfully.');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      setMessage('Failed to submit the issue.');
    }
  };

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setMessage('');
  };

  const handleUpdateTicket = async (event) => {
    event.preventDefault();
    if (!selectedTicket) return;
    setMessage('');

    try {
      const payload = {
        assignedTo: updateForm.assignedTo || undefined,
        status: updateForm.status,
        resolutionNotes: updateForm.resolutionNotes.trim(),
      };
      const response = await api.put(`/tickets/${selectedTicket._id}`, payload);
      setSelectedTicket(response.data);
      setTickets((prev) => prev.map((ticket) => (ticket._id === response.data._id ? response.data : ticket)));
      setMessage('Ticket updated successfully.');
    } catch (error) {
      console.error('Failed to update ticket:', error);
      setMessage('Unable to update ticket.');
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!selectedTicket) return;
    setMessage('');

    try {
      const payload = {
        message: commentForm.message.trim(),
      };
      const response = await api.post(`/tickets/${selectedTicket._id}/comment`, payload);
      setSelectedTicket(response.data);
      setTickets((prev) => prev.map((ticket) => (ticket._id === response.data._id ? response.data : ticket)));
      setCommentForm(defaultComment);
      setMessage('Comment added.');
    } catch (error) {
      console.error('Failed to add comment:', error);
      setMessage('Unable to add comment.');
    }
  };

  const ticketSummary = tickets.reduce(
    (summary, ticket) => {
      summary.status[ticket.status] = (summary.status[ticket.status] || 0) + 1;
      summary.priority[ticket.priority] = (summary.priority[ticket.priority] || 0) + 1;
      return summary;
    },
    { status: {}, priority: {} }
  );

  return (
    <div className="tickets-page">
      <div className="page-header">
        <h1>Internal Issue Tracker</h1>
        <p>Submit IT, maintenance, or office issues and track resolution from a central helpdesk.</p>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Open Tickets</h3>
          <p>{ticketSummary.status.open || 0}</p>
        </div>
        <div className="card">
          <h3>In Progress</h3>
          <p>{ticketSummary.status.in_progress || 0}</p>
        </div>
        <div className="card">
          <h3>Resolved</h3>
          <p>{ticketSummary.status.resolved || 0}</p>
        </div>
        <div className="card">
          <h3>Urgent</h3>
          <p>{ticketSummary.priority.urgent || 0}</p>
        </div>
      </div>

      <div className="ticket-grid">
        <section className="ticket-panel">
          <h2>Submit a New Issue</h2>
          <form className="ticket-form" onSubmit={handleCreateTicket}>
            <div className="form-grid">
              <label>
                Title
                <input name="title" value={form.title} onChange={handleFormChange} required />
              </label>
              <label>
                Department
                <select name="department" value={form.department} onChange={handleFormChange}>
                  <option value="">General</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select name="priority" value={form.priority} onChange={handleFormChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label>
                Description
                <textarea name="description" value={form.description} onChange={handleFormChange} rows="5" />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">Submit Issue</button>
            </div>
          </form>
        </section>

        <section className="ticket-panel">
          <h2>Issue Queue</h2>
          <div className="ticket-list">
            {tickets.map((ticket) => (
              <button
                key={ticket._id}
                type="button"
                className={`ticket-item ${selectedTicket?._id === ticket._id ? 'selected' : ''}`}
                onClick={() => handleSelectTicket(ticket)}
              >
                <strong>{ticket.title}</strong>
                <span className="ticket-meta">Priority: {ticket.priority}</span>
                <span className="ticket-meta">Status: {ticket.status.replace('_', ' ')}</span>
                <span className="ticket-meta">Department: {ticket.department?.name || 'General'}</span>
                <span className="ticket-meta">Requested by: {ticket.requester?.name || 'Unknown'}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selectedTicket && (
        <section className="ticket-panel">
          <h2>Issue Details</h2>
          <div className="ticket-details">
            <div className="form-grid">
              <div>
                <p><strong>Title:</strong> {selectedTicket.title}</p>
                <p><strong>Description:</strong> {selectedTicket.description || 'No additional details'}</p>
                <p><strong>Department:</strong> {selectedTicket.department?.name || 'General'}</p>
                <p><strong>Priority:</strong> {selectedTicket.priority}</p>
              </div>
              <div>
                <p><strong>Status:</strong> {selectedTicket.status.replace('_', ' ')}</p>
                <p><strong>Requester:</strong> {selectedTicket.requester?.name || 'Unknown'}</p>
                <p><strong>Assigned To:</strong> {selectedTicket.assignedTo?.name || 'Unassigned'}</p>
                <p><strong>Created:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="form-note">
              Update the ticket status, assign support staff, and add resolution notes or comments below.
            </div>

            <form className="form-grid" onSubmit={handleUpdateTicket}>
              <label>
                Assign Staff
                <select name="assignedTo" value={updateForm.assignedTo} onChange={handleUpdateChange}>
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select name="status" value={updateForm.status} onChange={handleUpdateChange}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label>
                Resolution Notes
                <textarea name="resolutionNotes" value={updateForm.resolutionNotes} onChange={handleUpdateChange} rows="4" />
              </label>
              <div className="form-actions">
                <button type="submit">Save Update</button>
              </div>
            </form>

            <div className="asset-subpanel">
              <h3>Comments</h3>
              {selectedTicket.comments?.length > 0 ? (
                <ul className="comment-list">
                  {selectedTicket.comments.map((comment, idx) => (
                    <li key={idx}>
                      <div className="comment-author">
                        {comment.author?.name || 'Unknown'} • {new Date(comment.createdAt).toLocaleString()}
                      </div>
                      <p>{comment.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No comments yet.</p>
              )}
              <form className="form-grid" onSubmit={handleAddComment}>
                <label>
                  Add Comment
                  <textarea name="message" value={commentForm.message} onChange={handleCommentChange} rows="3" required />
                </label>
                <div className="form-actions">
                  <button type="submit">Post Comment</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {message && <div className="message">{message}</div>}
    </div>
  );
}
