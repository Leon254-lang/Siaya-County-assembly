# Integrated County Assembly Management System (ICAMS) Documentation

## Executive Summary
Integrated County Assembly Management System (ICAMS) is a centralized web-based platform designed to digitize and streamline county assembly operations. It supports document management, attendance, meetings, visitors, procurement, finance, HR, public participation, communications, and audit monitoring in one unified system. The platform is built for role-based access, accountability, and ease of daily administration.

## 1. Overview
ICAMS provides a secure digital environment for county assembly staff and administrators to manage operations, records, requests, and communications. The system brings together core processes such as document tracking, attendance management, procurement workflow, HR administration, and public engagement into a single portal.

## 2. Purpose
The system is intended to:
- streamline internal operations for county assembly staff
- improve service delivery to members of the public
- maintain audit trails and accountability
- provide role-based access to sensitive records
- support document, meeting, request, and attendance tracking

## 3. Core Functional Modules

### 3.1 Authentication and User Management
- User registration and login
- Role-based access control
- Password-protected sessions
- Admin user management
- User roles such as Super Admin, ICT Admin, HR Officer, Clerk, Procurement Officer, Registry, and general users

### 3.2 Dashboard
- Personalized landing page after authentication
- Summary of upcoming meetings, reminders, and announcements
- Administrative overview for privileged users
- Quick links to major modules

### 3.3 Document Management
- Create, edit, view, and track documents
- Document numbering and metadata management
- Upload and download attachments
- Assign documents, move them through departments, and maintain workflow history
- Support for bills, memos, letters, minutes, and reports

### 3.4 Attendance and Leave Management
- Staff attendance tracking
- Leave request submission and approval flows
- Attendance summaries and reports
- Support for attendance-related administrative oversight

### 3.5 Meetings and Sessions
- Schedule meetings and sessions
- View meeting reminders and calendars
- Manage committee and assembly-related events

### 3.6 Committees and Leadership
- Maintain committees and leadership profiles
- Support council and parliamentary-related organization structure

### 3.7 Visitors and Public Participation
- Register visitor details
- Capture feedback and public engagement data
- Manage complaints and support requests

### 3.8 Assets and Network Devices
- Track assembly assets
- Monitor devices and infrastructure records

### 3.9 Procurement and Stores
- Manage procurement requests
- Track store inventory and related workflows
- Support registry-linked procurement operations

### 3.10 Finance and Bills
- Manage financial records
- Handle bills and finance-related records

### 3.11 HR and Appraisals
- Manage staff-related HR workflows
- Handle internships, attachees, appraisals, and HR records

### 3.12 Communications and Media
- Publish announcements and notices
- Manage media centre posts and public communications

### 3.13 Audit and Monitoring
- Maintain audit logs for system activity
- Support oversight for administrative actions

## 4. User Roles
The system supports several user roles with varying permissions:
- Super Admin
- ICT Admin
- HR Officer
- Clerk
- Procurement Officer
- Registry
- General users

## 5. How Each User Should Use the System

### 5.1 Super Admin
- Manage system-wide settings and user accounts.
- Approve or monitor critical administrative actions.
- Review audit logs, manage roles, and oversee high-level operations.
- Use the dashboard to monitor activity across modules.

### 5.2 ICT Admin
- Maintain system access, technical operations, and digital infrastructure.
- Manage users, monitor system health, and review audit-related events.
- Support department-level system use and troubleshoot access issues.

### 5.3 HR Officer
- Manage staff records, leave requests, internships, attachees, and appraisal workflows.
- Review HR-related requests and update personnel information.
- Use the HR and attendance modules to support staff administration.

### 5.4 Clerk
- Coordinate administrative and legislative operations.
- Manage meetings, documents, schedules, and official records.
- Use the system as the operational hub for assembly correspondence and support functions.

### 5.5 Procurement Officer
- Create and review procurement requests.
- Track procurement-related records, stores, and associated approvals.
- Use the procurement and registry modules to maintain accountability.

### 5.6 Registry
- Process registry-related documents and requests.
- Maintain records that support procurement and administrative workflows.
- Ensure document movement and record handling are properly tracked.

### 5.7 General Users
- Log in to access the dashboard and relevant personal modules.
- Submit requests, view announcements, and interact with assigned workflows.
- Use the system for daily operational tasks according to their assigned role.

## 6. Typical Business Workflows

### 6.1 Login Flow
1. User enters credentials on the login page.
2. Backend authenticates the user.
3. A token is issued and stored locally.
4. The user is redirected to the dashboard or authorized page.

### 6.2 Document Workflow
1. A user creates a document with metadata.
2. The document is submitted for review.
3. It can be assigned to a department or user.
4. The document can be approved, rejected, archived, or moved.
5. Actions are recorded in the audit trail.

### 6.3 Leave Workflow
1. Staff submits leave request.
2. The system captures leave type, dates, and supporting information.
3. The request is routed for approval.
4. The leave record is updated in the attendance/HR module.

### 6.4 Procurement Workflow
1. A request is created.
2. It is routed for review and approval.
3. The request is tracked through procurement and registry processes.
4. Records are stored for accountability.

### 6.5 Approval and Escalation Workflows
Motion, document, committee report, budget, public participation, leave, and overdue action workflows record a submitter or acting officer, decision status, decision timestamp, comments or reason, and the next responsible officer. Workflow history is stored on the record and returned with the relevant API response. Committee reports enter the document workflow as submitted records and follow review, approval, publication, rejection, or archival transitions. Overdue committee action items can be escalated with a new responsible officer and reason.

## 7. Technical Architecture

### 7.1 Frontend
- React application with Vite
- Client-side routing using React Router
- Reusable UI components and pages

### 7.2 Backend
- Node.js + Express server
- RESTful API routes
- Authentication using JSON Web Tokens
- MongoDB database via Mongoose

### 7.3 File Handling
- Upload support for attachments and documents
- Static upload directories for files such as documents, avatars, leave files, procurement files, and meeting uploads

### 7.4 Security Considerations
- Token-based access control
- Role-based permissions for protected routes
- Audit logging for sensitive actions
- HTTPS redirect and HSTS in production
- Bcrypt password hashing and TOTP MFA for privileged accounts
- Authentication rate limiting and failed-login monitoring
- Upload extension allowlists and configurable upload-size limits
- Encrypted MongoDB backups with daily scheduling and isolated restore tests

### 7.5 Security, Backup, and Disaster Recovery Runbook
- **HTTPS:** Production traffic must terminate at HTTPS. The application redirects forwarded HTTP requests and emits HSTS. Set `NODE_ENV=production` and configure the platform TLS certificate.
- **MFA:** Privileged users call `/api/auth/mfa/setup`, scan the returned `otpauth` URI in an authenticator application, then call `/api/auth/mfa/enable` with the current six-digit code. Set `REQUIRE_PRIVILEGED_MFA=true` after enrollment; privileged logins then require `mfaCode`.
- **Backups:** Install MongoDB Database Tools and OpenSSL on the scheduled backup worker. Set `MONGO_URI`, `BACKUP_ENCRYPTION_KEY`, `BACKUP_DIR`, and `BACKUP_RETENTION_DAYS`, then run `scripts/backup_mongodb.sh` daily. The backup is encrypted with AES-256-CBC using PBKDF2 and must be stored separately from production credentials. The scheduled service in `render.yaml` is a deployment template and must run on an image that includes these tools.
- **Restore testing:** Run `scripts/test_restore_mongodb.sh` against an isolated test database at least monthly and after backup-process changes. Never use the production URI for restore tests.
- **Recovery:** For an incident, freeze writes, preserve audit logs, identify the last verified backup, restore into a new isolated database, validate application health and counts, then switch the application connection string and rotate credentials. Record the incident and recovery time.
- **Environments:** Use separate MongoDB databases, JWT secrets, encryption keys, upload buckets, and email/SMS credentials for development, testing, staging, and production. Never copy production data or secrets into lower environments.
- **Upload scanning:** Install ClamAV and set `CLAMSCAN_PATH` to the `clamscan` executable. Without it, extension and size validation still applies, but production policy should require a configured malware scanner.

## 8. Main Routes
The application exposes the following major route groups:
- /dashboard
- /login
- /register
- /documents
- /attendance
- /meetings
- /committees
- /visitors
- /assets
- /tickets
- /interns
- /finance
- /procurement
- /registry
- /announcements
- /messages
- /audit-logs
- /manage-users
- /hr-appraisals
- /hr

## 9. Deployment Notes
- Backend can be run with npm start or npm run dev
- Frontend can be started separately in the client folder
- Environment configuration should define database and JWT settings
- The app is designed to be deployed as a web application with MongoDB support

## 10. Version History
- Version 1.0 — Initial documentation release covering system overview, modules, workflows, roles, and deployment notes.

## 11. Approval and Sign-off
Prepared by: ____________________________

Reviewed by: ____________________________

Approved by: ____________________________

Date: ____________________________

Position: ____________________________

## 12. Summary
ICAMS is a comprehensive digital platform for managing assembly operations, combining administrative, legislative, HR, finance, and public-service workflows in one secure system. The documentation above explains how each user role should interact with the system to perform daily responsibilities efficiently and securely.
