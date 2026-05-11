import { useEffect, useState } from 'react';
import api from '../services/api';

const initialForm = {
  title: '',
  description: '',
  category: 'bill_notice',
  submittedBy: '',
  status: 'draft',
  eventDate: '',
  eventLocation: '',
  registrationDeadline: '',
  reportSummary: '',
  reportDetails: '',
};

const initialCommentForm = {
  name: '',
  email: '',
  message: '',
};

const initialRegistrationForm = {
  name: '',
  email: '',
  phone: '',
  organization: '',
};

const categoryLabels = {
  bill_notice: 'Bill / Notice',
  event_notice: 'Event Notice',
  public_comment: 'Public Comment',
  feedback_report: 'Feedback Report',
};

const statusLabels = {
  draft: 'Draft',
  published: 'Published',
  reviewed: 'Reviewed',
  archived: 'Archived',
};

export default function Feedback() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [commentForm, setCommentForm] = useState(initialCommentForm);
  const [registrationForm, setRegistrationForm] = useState(initialRegistrationForm);
  const [message, setMessage] = useState('');

  const fetchItems = async () => {
    try {
      const response = await api.get('/feedback');
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load public participation items:', error);
      setMessage('Unable to load public participation data.');
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setMessage('');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateItem = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const payload = {
        ...form,
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : undefined,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
      };
      const response = await api.post('/feedback', payload);
      setItems((prev) => [response.data, ...prev]);
      setSelectedItem(response.data);
      resetForm();
      setMessage('Public participation item created.');
    } catch (error) {
      console.error('Failed to create item:', error);
      setMessage('Unable to create public participation item.');
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setCommentForm(initialCommentForm);
    setRegistrationForm(initialRegistrationForm);
    setMessage('');
  };

  const handlePublishItem = async () => {
    if (!selectedItem) return;
    try {
      const payload = {
        ...selectedItem,
        status: 'published',
      };
      const response = await api.put(`/feedback/${selectedItem._id}`, payload);
      setSelectedItem(response.data);
      setItems((prev) => prev.map((item) => (item._id === response.data._id ? response.data : item)));
      setMessage('Item published successfully.');
    } catch (error) {
      console.error('Failed to publish item:', error);
      setMessage('Unable to publish item.');
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!selectedItem) return;
    setMessage('');

    try {
      const payload = {
        ...commentForm,
      };
      const response = await api.post(`/feedback/${selectedItem._id}/comment`, payload);
      setSelectedItem(response.data);
      setItems((prev) => prev.map((item) => (item._id === response.data._id ? response.data : item)));
      setCommentForm(initialCommentForm);
      setMessage('Comment submitted.');
    } catch (error) {
      console.error('Failed to submit comment:', error);
      setMessage('Unable to submit comment.');
    }
  };

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();
    if (!selectedItem) return;
    setMessage('');

    try {
      const payload = {
        ...registrationForm,
      };
      const response = await api.post(`/feedback/${selectedItem._id}/register`, payload);
      setSelectedItem(response.data);
      setItems((prev) => prev.map((item) => (item._id === response.data._id ? response.data : item)));
      setRegistrationForm(initialRegistrationForm);
      setMessage('Event registration submitted.');
    } catch (error) {
      console.error('Failed to register for event:', error);
      setMessage('Unable to submit event registration.');
    }
  };

  const counts = items.reduce(
    (summary, item) => {
      summary[item.category] = (summary[item.category] || 0) + 1;
      return summary;
    },
    {
      bill_notice: 0,
      event_notice: 0,
      public_comment: 0,
      feedback_report: 0,
    }
  );

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>Public Participation Management</h1>
        <p>Publish bills and notices, collect citizen comments, manage event registrations, and track feedback reports.</p>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Bills & Notices</h3>
          <p>{counts.bill_notice}</p>
        </div>
        <div className="card">
          <h3>Event Notices</h3>
          <p>{counts.event_notice}</p>
        </div>
        <div className="card">
          <h3>Public Comments</h3>
          <p>{counts.public_comment}</p>
        </div>
        <div className="card">
          <h3>Feedback Reports</h3>
          <p>{counts.feedback_report}</p>
        </div>
      </div>

      <div className="asset-grid">
        <section className="asset-panel">
          <h2>Publish New Item</h2>
          <form className="asset-form" onSubmit={handleCreateItem}>
            <div className="form-grid">
              <label>
                Title
                <input name="title" value={form.title} onChange={handleFormChange} required />
              </label>
              <label>
                Category
                <select name="category" value={form.category} onChange={handleFormChange}>
                  <option value="bill_notice">Bill / Notice</option>
                  <option value="event_notice">Event Notice</option>
                  <option value="public_comment">Public Comment</option>
                  <option value="feedback_report">Feedback Report</option>
                </select>
              </label>
              <label>
                Submitted By
                <input name="submittedBy" value={form.submittedBy} onChange={handleFormChange} placeholder="Department or staff name" />
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={handleFormChange}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label>
                Description
                <textarea name="description" value={form.description} onChange={handleFormChange} rows="4" />
              </label>
              {form.category === 'event_notice' && (
                <>
                  <label>
                    Event Date
                    <input type="datetime-local" name="eventDate" value={form.eventDate} onChange={handleFormChange} />
                  </label>
                  <label>
                    Event Location
                    <input name="eventLocation" value={form.eventLocation} onChange={handleFormChange} />
                  </label>
                  <label>
                    Registration Deadline
                    <input type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleFormChange} />
                  </label>
                </>
              )}
              {form.category === 'feedback_report' && (
                <>
                  <label>
                    Report Summary
                    <textarea name="reportSummary" value={form.reportSummary} onChange={handleFormChange} rows="3" />
                  </label>
                  <label>
                    Report Details
                    <textarea name="reportDetails" value={form.reportDetails} onChange={handleFormChange} rows="3" />
                  </label>
                </>
              )}
            </div>
            <div className="form-actions">
              <button type="submit">Create Publication</button>
            </div>
          </form>
        </section>

        <section className="asset-panel">
          <h2>Published Items</h2>
          <div className="asset-list">
            {items.map((item) => (
              <button
                key={item._id}
                type="button"
                className={`asset-item ${selectedItem?._id === item._id ? 'selected' : ''}`}
                onClick={() => handleSelectItem(item)}
              >
                <strong>{item.title}</strong>
                <span className="asset-meta">{categoryLabels[item.category]}</span>
                <span className="asset-meta">Status: {statusLabels[item.status]}</span>
                {item.publishedOn && <span className="asset-meta">Published: {new Date(item.publishedOn).toLocaleDateString()}</span>}
              </button>
            ))}
            {items.length === 0 && <p>No public participation items available yet.</p>}
          </div>
        </section>
      </div>

      {selectedItem && (
        <section className="asset-panel">
          <div className="profile-header">
            <h2>{selectedItem.title}</h2>
            {selectedItem.status !== 'published' && (
              <button type="button" onClick={handlePublishItem} className="edit-btn">
                Publish Now
              </button>
            )}
          </div>
          <div className="form-grid">
            <div>
              <p><strong>Category:</strong> {categoryLabels[selectedItem.category]}</p>
              <p><strong>Status:</strong> {statusLabels[selectedItem.status]}</p>
              <p><strong>Submitted By:</strong> {selectedItem.submittedBy || 'N/A'}</p>
              <p><strong>Description:</strong> {selectedItem.description || 'No description provided.'}</p>
              {selectedItem.category === 'event_notice' && (
                <>
                  <p><strong>Event Date:</strong> {selectedItem.eventDate ? new Date(selectedItem.eventDate).toLocaleString() : 'TBD'}</p>
                  <p><strong>Location:</strong> {selectedItem.eventLocation || 'TBD'}</p>
                  <p><strong>Registration Deadline:</strong> {selectedItem.registrationDeadline ? new Date(selectedItem.registrationDeadline).toLocaleDateString() : 'No deadline'}</p>
                </>
              )}
              {selectedItem.category === 'feedback_report' && (
                <>
                  <p><strong>Report Summary:</strong> {selectedItem.reportSummary || 'No summary provided.'}</p>
                  <p><strong>Report Details:</strong> {selectedItem.reportDetails || 'No details provided.'}</p>
                </>
              )}
            </div>
            <div>
              <p><strong>Created At:</strong> {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString() : 'N/A'}</p>
              {selectedItem.publishedOn && <p><strong>Published On:</strong> {new Date(selectedItem.publishedOn).toLocaleDateString()}</p>}
            </div>
          </div>

          <div className="intern-subpanels">
            <div className="intern-subpanel">
              <h3>Comments</h3>
              {selectedItem.comments?.length > 0 ? (
                <ul className="record-list">
                  {selectedItem.comments.map((comment, index) => (
                    <li key={index}>
                      <strong>{comment.name || 'Anonymous'}</strong> • {new Date(comment.createdAt).toLocaleDateString()}
                      <p>{comment.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No comments yet.</p>
              )}
              <form onSubmit={handleCommentSubmit} className="form-grid">
                <label>
                  Name
                  <input name="name" value={commentForm.name} onChange={(e) => setCommentForm((prev) => ({ ...prev, name: e.target.value }))} />
                </label>
                <label>
                  Email
                  <input type="email" name="email" value={commentForm.email} onChange={(e) => setCommentForm((prev) => ({ ...prev, email: e.target.value }))} />
                </label>
                <label>
                  Comment
                  <textarea name="message" value={commentForm.message} onChange={(e) => setCommentForm((prev) => ({ ...prev, message: e.target.value }))} rows="3" required />
                </label>
                <div className="form-actions">
                  <button type="submit">Submit Comment</button>
                </div>
              </form>
            </div>

            {selectedItem.category === 'event_notice' && (
              <div className="intern-subpanel">
                <h3>Event Registration</h3>
                {selectedItem.registrations?.length > 0 ? (
                  <ul className="record-list">
                    {selectedItem.registrations.map((registration, index) => (
                      <li key={index}>
                        <strong>{registration.name}</strong> • {registration.organization || 'No organization'}
                        <p>{registration.email} | {registration.phone || 'No phone'}</p>
                        <small>Registered at: {new Date(registration.registeredAt).toLocaleDateString()}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No registrations yet.</p>
                )}
                <form onSubmit={handleRegistrationSubmit} className="form-grid">
                  <label>
                    Name
                    <input name="name" value={registrationForm.name} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, name: e.target.value }))} required />
                  </label>
                  <label>
                    Email
                    <input type="email" name="email" value={registrationForm.email} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, email: e.target.value }))} required />
                  </label>
                  <label>
                    Phone
                    <input name="phone" value={registrationForm.phone} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, phone: e.target.value }))} />
                  </label>
                  <label>
                    Organization
                    <input name="organization" value={registrationForm.organization} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, organization: e.target.value }))} />
                  </label>
                  <div className="form-actions">
                    <button type="submit">Register for Event</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      )}

      {message && <div className="message">{message}</div>}
    </div>
  );
}
