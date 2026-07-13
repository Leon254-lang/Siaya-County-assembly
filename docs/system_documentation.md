# Integrated County Assembly Management System (ICAMS) Documentation

## 1. Overview
Integrated County Assembly Management System (ICAMS) is a web-based platform designed to centralize and digitize operational workflows for a county assembly. It supports administrative, legislative, HR, finance, procurement, attendance, visitor, and public engagement functions in a single system.

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
- User roles such as Super Admin, ICT Admin, HR Officer, Clerk, Procurement Officer, and general users

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

## 5. Typical Business Workflows

### 5.1 Login Flow
1. User enters credentials on the login page.
2. Backend authenticates the user.
3. A token is issued and stored locally.
4. The user is redirected to the dashboard or authorized page.

### 5.2 Document Workflow
1. A user creates a document with metadata.
2. The document is submitted for review.
3. It can be assigned to a department or user.
4. The document can be approved, rejected, archived, or moved.
5. Actions are recorded in the audit trail.

### 5.3 Leave Workflow
1. Staff submits leave request.
2. The system captures leave type, dates, and supporting information.
3. The request is routed for approval.
4. The leave record is updated in the attendance/HR module.

### 5.4 Procurement Workflow
1. A request is created.
2. It is routed for review and approval.
3. The request is tracked through procurement and registry processes.
4. Records are stored for accountability.

## 6. Technical Architecture

### 6.1 Frontend
- React application with Vite
- Client-side routing using React Router
- Reusable UI components and pages

### 6.2 Backend
- Node.js + Express server
- RESTful API routes
- Authentication using JSON Web Tokens
- MongoDB database via Mongoose

### 6.3 File Handling
- Upload support for attachments and documents
- Static upload directories for files such as documents, avatars, leave files, procurement files, and meeting uploads

### 6.4 Security Considerations
- Token-based access control
- Role-based permissions for protected routes
- Audit logging for sensitive actions

## 7. Main Routes
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

## 8. Deployment Notes
- Backend can be run with npm start or npm run dev
- Frontend can be started separately in the client folder
- Environment configuration should define database and JWT settings
- The app is designed to be deployed as a web application with MongoDB support

## 9. Summary
ICAMS is a comprehensive digital platform for managing assembly operations, combining administrative, legislative, HR, finance, and public-service workflows in one secure system.
