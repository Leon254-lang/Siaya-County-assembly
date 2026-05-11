import { useState, useEffect } from 'react';
import api from '../services/api';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

export default function Procurement() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await api.get('/procurement/files');
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Failed to load procurement documents:', error);
      setErrorMessage('Could not load procurement documents. Please refresh or check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    try {
      setUploading(true);
      setUploadMessage('Uploading document...');
      setErrorMessage('');
      await api.post('/procurement/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMessage('Document uploaded successfully.');
      fetchFiles();
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadMessage('Upload failed. Please try again.');
      setErrorMessage(error?.response?.data?.message || 'Unable to upload document.');
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

  const fileCount = files.length;
  const latestUpload = files[0] ? formatDateTime(files[0].uploadedAt) : 'No uploads yet';

  return (
    <div className="card procurement-card">
      <div className="procurement-header">
        <div>
          <span className="eyebrow">Procurement Center</span>
          <h1>Procurement Documents</h1>
          <p>
            Keep procurement files organized, accessible, and easy to manage. Upload documents here for fast download in the procurement module.
          </p>
        </div>

        <div className="upload-panel">
          <div className="upload-actions">
            <p className="upload-label">Upload new procurement documents</p>
            <label htmlFor="procurement-file-upload" className="button upload-button">
              {uploading ? 'Uploading…' : 'Upload Document'}
            </label>
            <input
              id="procurement-file-upload"
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx,.txt"
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </div>

          <div className="upload-meta">
            <div className="summary-card">
              <span>Total Files</span>
              <strong>{fileCount}</strong>
            </div>
            <div className="summary-card">
              <span>Latest Upload</span>
              <strong>{latestUpload}</strong>
            </div>
          </div>
        </div>
      </div>

      {uploadMessage && (
        <div className={`message ${uploading ? '' : 'success-message'}`}>
          {uploadMessage}
        </div>
      )}

      {errorMessage && (
        <div className="message error-message">{errorMessage}</div>
      )}

      <div className="procurement-controls">
        <div className="storage-note">
          <strong>Storage folder:</strong> <code>/uploads/procurement/</code>
        </div>
        <div className="procurement-control-actions">
          <button onClick={fetchFiles} disabled={loading}>
            Refresh List
          </button>
          <a
            href="https://siayaassembly.go.ke/procurement/#102-tenders-p2"
            target="_blank"
            rel="noreferrer"
            className="button small-button"
          >
            More Procurements
          </a>
        </div>
      </div>

      <div className="procurement-file-list">
        {loading ? (
          <p>Loading procurement documents...</p>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <h3>No procurement documents yet</h3>
            <p>Upload a file to make it available to procurement users and stakeholders.</p>
          </div>
        ) : (
          <div className="table-card">
            <table className="file-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.filename}>
                    <td>
                      <div className="file-name">{file.originalName}</div>
                      <div className="file-meta">{file.filename}</div>
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{formatDateTime(file.uploadedAt)}</td>
                    <td className="text-right">
                      <a href={file.url} target="_blank" rel="noreferrer" className="button small-button">
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
