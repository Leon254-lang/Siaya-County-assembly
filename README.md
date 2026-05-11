# Integrated County Assembly Management System (ICAMS)

A centralized web-based platform for managing internal county assembly operations.

## Core modules

- Authentication & User Management
- Document Tracking
- Attendance Management
- Visitor Management
- Committee & Meeting Management
- Asset Management
- Complaint / Helpdesk
- Internship Management
- Public Participation

## Getting Started

1. Copy `.env.example` to `.env` and configure `MONGO_URI` and `JWT_SECRET`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Seed roles and initial admin user:
   ```bash
   npm run seed
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

## Frontend scaffold

A minimal React frontend is available in the `client/` folder:

1. Change into the client directory:
   ```bash
   cd client
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the React app:
   ```bash
   npm run dev
   ```

## 📄 Document Tracking & Management System

A comprehensive system for managing county assembly documents with full workflow tracking and approval processes.

### Features

#### ✅ Document Management
- **Document Creation**: Create documents with automatic tracking number generation (DOC-YYYY-XXXX format)
- **Document Types**: Support for incoming, outgoing, memos, bills, reports, minutes, letters, and contracts
- **Categories**: Administrative, Financial, Legal, Technical, Personnel, and Public documents
- **Priority Levels**: Low, Medium, High, and Urgent priority classification
- **Metadata Tracking**: Origin, destination, sender/recipient information, due dates, and tags

#### 📤 File Upload & Management
- **Multi-file Support**: Upload multiple files per document
- **File Metadata**: Store original filename, size, MIME type, and upload timestamp
- **File Downloads**: Secure download functionality for authorized users
- **File Deletion**: Remove files with proper cleanup

#### 🔄 Workflow & Approval System
- **Status Tracking**: Draft → Pending → Under Review → Approved/Rejected → Archived
- **Approval History**: Complete audit trail of all actions and comments
- **Department Movement**: Track document movement between departments
- **Assignment System**: Assign documents to specific users for processing
- **Role-based Actions**: Different permissions for different user roles

#### 🔍 Advanced Search & Filtering
- **Full-text Search**: Search across titles, descriptions, document numbers, and tags
- **Multi-filter Support**: Filter by type, status, category, priority, department, and assignee
- **Pagination**: Efficient handling of large document collections
- **Real-time Updates**: Live search results as you type

#### 📊 Document Tracking Features
- **Movement History**: Track document journey through different departments
- **Current Location**: Always know which department has the document
- **Processing Timeline**: View complete history from creation to archiving
- **Status Indicators**: Visual status badges with color coding

### API Endpoints

#### Document CRUD Operations
```
GET    /api/documents          # List documents with search/filtering
POST   /api/documents          # Create new document
GET    /api/documents/:id      # Get document details
PUT    /api/documents/:id      # Update document
```

#### File Management
```
POST   /api/documents/:id/upload     # Upload file to document
GET    /api/documents/:id/download/:fileId  # Download specific file
DELETE /api/documents/:id/file/:fileId      # Delete specific file
```

#### Workflow Operations
```
POST   /api/documents/:id/submit    # Submit document for approval
POST   /api/documents/:id/approve   # Approve document
POST   /api/documents/:id/reject    # Reject document
POST   /api/documents/:id/archive   # Archive document
POST   /api/documents/:id/move      # Move document to another department
POST   /api/documents/:id/assign    # Assign document to user
```

### Usage Examples

#### Creating a Document
```javascript
const documentData = {
  title: "Budget Proposal 2024",
  description: "Annual budget proposal for county operations",
  type: "bill",
  category: "financial",
  priority: "high",
  origin: "Finance Department",
  destination: "County Assembly",
  currentDepartment: "Finance",
  tags: "budget,2024,finance"
};

await api.post('/documents', documentData);
```

#### Uploading Files
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

await api.post(`/documents/${documentId}/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

#### Searching Documents
```javascript
const params = new URLSearchParams({
  search: 'budget',
  type: 'bill',
  status: 'pending',
  page: 1,
  limit: 10
});

const response = await api.get(`/documents?${params}`);
```

### Document Status Flow

1. **Draft**: Document created but not yet submitted
2. **Pending**: Submitted for review/approval
3. **Under Review**: Being reviewed by assigned personnel
4. **Approved**: Approved and ready for implementation
5. **Rejected**: Rejected with comments for revision
6. **Archived**: Final status, stored for reference

### Security & Permissions

- **JWT Authentication**: All endpoints require valid authentication
- **Role-based Access**: Different roles have different permissions
- **File Security**: Secure file storage and access controls
- **Audit Trail**: Complete logging of all document actions

### Database Schema

Documents are stored in MongoDB with the following key fields:
- `docNumber`: Auto-generated tracking number
- `title`, `description`: Document metadata
- `type`, `category`, `priority`: Classification fields
- `status`: Current workflow status
- `files`: Array of attached files with metadata
- `approvalHistory`: Complete audit trail
- `movementHistory`: Department transfer tracking
- `owner`, `assignedTo`: User relationships

This system provides county assemblies with a robust, scalable solution for managing their document workflows efficiently and transparently.

- `POST /api/documents` creates a document and auto-generates `docNumber`
- `POST /api/documents/:id/upload` uploads a file and attaches it to a document
- `POST /api/documents/:id/approve` approves a document
- `POST /api/documents/:id/reject` rejects a document
- `POST /api/documents/:id/archive` archives a document

## ⏰ Attendance Management System

A comprehensive attendance tracking system designed for county assemblies, supporting staff, interns, and MCAs with modern features including fingerprint integration readiness and QR code attendance.

### Features

#### ✅ Daily Check-in/Check-out
- **Multiple Check-in Methods**: Manual, fingerprint, QR code, card, and face recognition
- **Real-time Tracking**: Live attendance status with timestamps
- **Location Tracking**: GPS coordinates and device information
- **Working Hours Calculation**: Automatic calculation with break time deduction
- **Overtime Tracking**: Monitor extra working hours

#### 📊 Leave Management
- **Leave Types**: Annual, sick, maternity, paternity, emergency, study, and compassionate leave
- **Leave Requests**: Online submission with approval workflow
- **Leave Balance**: Track remaining leave days
- **Leave Calendar**: Visual calendar showing leave dates
- **Attachment Support**: Upload supporting documents

#### 📈 Attendance Reports
- **Monthly Summaries**: Comprehensive monthly attendance reports
- **User-specific Reports**: Individual attendance summaries
- **Department Reports**: Department-wide attendance analytics
- **Status Breakdown**: Present, absent, leave, partial attendance
- **Working Hours Reports**: Total hours worked per user/month

#### 🔐 Security & Integration
- **Fingerprint Ready**: Database structure prepared for fingerprint integration
- **QR Code Attendance**: Generate and verify QR codes for interns/visitors
- **Role-based Access**: Different permissions for staff, HR, and security
- **Audit Trail**: Complete logging of all attendance actions
- **Device Tracking**: Monitor check-in/check-out devices and locations

#### 🎯 Bonus Features
- **QR Code Generation**: Create time-limited QR codes for attendance
- **Visitor Attendance**: Support for visitor check-in/check-out
- **Mobile Friendly**: Responsive design for mobile devices
- **Real-time Updates**: Live attendance status updates
- **Automated Absent Marking**: Mark users as absent who haven't checked in

### API Endpoints

#### Attendance Operations
```
POST   /api/attendance/checkin          # Check-in with various methods
POST   /api/attendance/checkout         # Check-out with break time
GET    /api/attendance                  # Get attendance records with filtering
POST   /api/attendance/generate-qr      # Generate QR code for attendance
POST   /api/attendance/verify-qr        # Verify QR code attendance
GET    /api/attendance/summary/:userId/:year/:month  # Monthly summary
GET    /api/attendance/report           # Generate attendance reports
POST   /api/attendance/mark-absent      # Mark absent users automatically
```

#### Leave Management
```
GET    /api/leave                       # Get leave requests with filtering
POST   /api/leave                       # Submit leave request
POST   /api/leave/:id/upload            # Upload leave attachments
POST   /api/leave/:id/approve           # Approve leave request
POST   /api/leave/:id/reject            # Reject leave request
GET    /api/leave/balance/:userId       # Get leave balance
GET    /api/leave/calendar/:year/:month # Get leave calendar
```

### Database Schema

#### Attendance Collection
```javascript
{
  user: ObjectId,           // Reference to User
  userType: String,         // 'staff', 'intern', 'mca', 'visitor'
  date: Date,              // Attendance date
  month: Number,           // Month (1-12)
  year: Number,            // Year
  status: String,          // 'present', 'absent', 'leave', 'remote', 'partial', 'late'
  checkIn: {
    time: Date,
    method: String,        // 'manual', 'fingerprint', 'qr_code', 'card', 'face_recognition'
    location: String,
    deviceId: String
  },
  checkOut: {
    time: Date,
    method: String,
    location: String,
    deviceId: String
  },
  workingHours: Number,    // Calculated working hours
  breakTime: Number,      // Break time in minutes
  overtime: Number,       // Overtime hours
  leaveType: String,      // If on leave
  notes: String,
  qrCode: {               // For QR code attendance
    code: String,
    generatedAt: Date,
    expiresAt: Date,
    isActive: Boolean
  },
  fingerprintData: {      // For future fingerprint integration
    template: String,
    deviceId: String,
    capturedAt: Date
  },
  location: {             // GPS coordinates
    latitude: Number,
    longitude: Number,
    address: String
  },
  deviceInfo: {           // Device tracking
    userAgent: String,
    ipAddress: String,
    deviceType: String
  }
}
```

#### Leave Collection
```javascript
{
  user: ObjectId,           // Reference to User
  type: String,            // 'annual', 'sick', 'maternity', etc.
  startDate: Date,
  endDate: Date,
  daysRequested: Number,   // Auto-calculated
  reason: String,
  status: String,          // 'pending', 'approved', 'rejected', 'cancelled'
  approvedBy: ObjectId,    // Reference to User
  approvedAt: Date,
  comments: String,
  attachments: [{          // Supporting documents
    filename: String,
    path: String,
    uploadedAt: Date
  }]
}
```

### Usage Examples

#### Check-in
```javascript
const checkInData = {
  method: 'qr_code',
  location: 'Main Entrance',
  deviceId: 'DEVICE_001'
};

await api.post('/attendance/checkin', checkInData);
```

#### Check-out
```javascript
const checkOutData = {
  method: 'fingerprint',
  location: 'Main Entrance',
  breakTime: 30  // minutes
};

await api.post('/attendance/checkout', checkOutData);
```

#### Generate QR Code
```javascript
const qrData = await api.post('/attendance/generate-qr', {
  expiresIn: 24  // hours
});
// Returns: { qrCode: "abc123...", expiresAt: "2026-05-05T10:00:00Z" }
```

#### Submit Leave Request
```javascript
const leaveData = {
  type: 'annual',
  startDate: '2026-05-10',
  endDate: '2026-05-15',
  reason: 'Family vacation'
};

await api.post('/leave', leaveData);
```

#### Get Monthly Summary
```javascript
const summary = await api.get('/attendance/summary/userId/2026/5');
// Returns comprehensive monthly attendance data
```

### Security Features

- **JWT Authentication**: All endpoints require valid authentication
- **Role-based Permissions**: Different access levels for different user types
- **QR Code Expiration**: Time-limited QR codes for security
- **Device Tracking**: Monitor and log all check-in/check-out devices
- **Location Validation**: GPS-based location verification
- **Audit Logging**: Complete trail of all attendance actions

### Integration Ready

#### Fingerprint Integration
The system is designed to integrate with fingerprint scanners:
- Database fields ready for fingerprint templates
- Device ID tracking for multiple scanners
- Method field supports 'fingerprint' check-ins

#### QR Code Integration
- Generate QR codes for interns and visitors
- Time-based expiration for security
- Mobile-friendly QR scanning
- Batch QR code generation capabilities

#### Mobile App Ready
- RESTful API designed for mobile consumption
- Location-based check-ins
- Offline capability preparation
- Push notification support structure

This attendance management system provides county assemblies with enterprise-level workforce management capabilities, ensuring accurate time tracking, efficient leave management, and comprehensive reporting for all staff categories.

## API structure

- `POST /api/auth/register` (required before login)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/documents`
- `GET /api/attendance`
- `GET /api/visitors`
- `GET /api/meetings`
- `GET /api/assets`
- `GET /api/tickets`
- `GET /api/interns`
- `GET /api/feedback`

## Suggested MongoDB collections

- `users`
- `roles`
- `departments`
- `documents`
- `attendance`
- `visitors`
- `meetings`
- `committees`
- `assets`
- `tickets`
- `interns`
- `public_feedback`
