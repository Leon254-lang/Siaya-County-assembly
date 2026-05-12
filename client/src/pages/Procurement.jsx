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
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [userRole, setUserRole] = useState(null);
  const [deleting, setDeleting] = useState({});

  const isHOD = userRole === 'HOD' || userRole === 'Super Admin';
  const canUpload =
    isHOD ||
    userRole?.includes('Admin');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    fetchFiles();
  }, []);

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

  const handleFilesSelected = (event) => {
    const filesArray = Array.from(event.target.files || []);
    setSelectedFiles(filesArray);
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      setErrorMessage('Please select one or more files first.');
      return;
    }

    if (!canUpload) {
      setErrorMessage('Only HOD, Admin, or Super Admin can upload procurement documents.');
      return;
    }

    const data = new FormData();
    selectedFiles.forEach((file) => data.append('files', file));
    if (description) {
      data.append('description', description);
    }

    try {
      setUploading(true);
      setUploadMessage('Uploading documents...');
      setErrorMessage('');
      await api.post('/procurement/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMessage('Documents uploaded successfully.');
      setDescription('');
      setSelectedFiles([]);
      setFileInputKey(Date.now());
      fetchFiles();
    } catch (error) {
      console.error('Upload failed:', error);
      if (error?.response?.status === 403) {
        setErrorMessage('You do not have permission to upload procurement documents. Only HOD or Admin users can upload.');
      } else {
        setErrorMessage(error?.response?.data?.message || 'Unable to upload documents.');
      }
      setUploadMessage('');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeleting({ ...deleting, [documentId]: true });
      setErrorMessage('');
      await api.delete(`/procurement/${documentId}`);
      setUploadMessage('Document deleted successfully.');
      fetchFiles();
    } catch (error) {
      console.error('Delete failed:', error);
      setErrorMessage(error?.response?.data?.message || 'Unable to delete document.');
    } finally {
      setDeleting({ ...deleting, [documentId]: false });
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
            Keep procurement files organized, accessible, and easy to manage. {canUpload ? 'Upload documents here' : 'Access procurement documents'} in the procurement module.
          </p>
        </div>

        {canUpload && (
          <div className="upload-panel">
            <div className="upload-actions">
              <p className="upload-label">Upload new procurement documents</p>
              <input
                type="text"
                placeholder="Document description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  marginBottom: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.95rem',
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label htmlFor="procurement-file-upload" className="button upload-button" style={{ minWidth: '180px' }}>
                  Select Files
                </label>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || !selectedFiles.length}
                  className="button upload-button"
                  style={{ minWidth: '180px' }}
                >
                  {uploading ? 'Uploading…' : 'Upload Documents'}
                </button>
              </div>
              <input
                key={fileInputKey}
                id="procurement-file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                multiple
                onChange={handleFilesSelected}
                style={{ display: 'none' }}
                disabled={uploading}
              />
              {selectedFiles.length > 0 && (
                <div className="selected-files-list" style={{ marginTop: '0.75rem' }}>
                  <strong>Selected files:</strong>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                    {selectedFiles.map((file) => (
                      <li key={file.name + file.size}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
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
        )}

        {!canUpload && (
          <div className="upload-panel">
            <div className="warning-box" style={{ backgroundColor: '#fff3cd', padding: '1rem', borderRadius: '4px', color: '#664d03' }}>
              <strong>ℹ️ Upload Restricted:</strong> Only HOD, Admin, or Super Admin can upload procurement documents.
            </div>
          </div>
        )}
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
            <p>{canUpload ? 'Upload a file to make it available to procurement users and stakeholders.' : 'No procurement documents have been uploaded yet.'}</p>
          </div>
        ) : (
          <div className="table-card">
            <table className="file-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Uploaded By</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file._id}>
                    <td>
                      <div className="file-name">{file.originalName}</div>
                      {file.description && <div className="file-meta">{file.description}</div>}
                    </td>
                    <td>
                      <div className="file-name">{file.uploadedBy?.name || 'Unknown'}</div>
                      <div className="file-meta">{file.department?.name || 'No Department'}</div>
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{formatDateTime(file.uploadedAt)}</td>
                    <td className="text-right">
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <a href={file.url} target="_blank" rel="noreferrer" className="button small-button">
                          Download
                        </a>
                        {isHOD && (
                          <button
                            onClick={() => handleDelete(file._id)}
                            disabled={deleting[file._id]}
                            className="button small-button"
                            style={{ backgroundColor: '#dc3545', color: 'white' }}
                          >
                            {deleting[file._id] ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
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
