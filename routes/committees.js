const express = require('express');
const Committee = require('../models/Committee');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const Meeting = require('../models/Meeting');
const Document = require('../models/Document');
const { summarizeCommitteePerformance } = require('../utils/committeeManagement');
const multer = require('multer');
const { uploadLimits, secureFileFilter } = require('../middleware/uploadSecurity');
const { scanUploadedFiles } = require('../middleware/fileScan');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: uploadLimits, fileFilter: secureFileFilter });

const router = express.Router();

const defaultCommittees = [
  { name: 'Budget and Appropriations', description: 'Oversees the county budget, revenue allocation and appropriations.' },
  { name: 'Tourism, Wildlife Conservation and Information', description: 'Supports tourism, wildlife protection and public information services.' },
  { name: 'Lands, Physical Planning, Surveying and Housing', description: 'Manages land use planning, surveying and housing policy.' },
  { name: 'Agriculture, Livestock and Fisheries', description: 'Oversees agriculture, livestock production and fisheries management.' },
  { name: 'Public Works, Roads, Transport and Communication', description: 'Supervises roads, transport infrastructure and communications services.' },
  { name: 'Health Services', description: 'Monitors county health services and healthcare delivery.' },
  { name: 'Education, Youth Affairs Gender and Social Services', description: 'Oversees education, youth affairs, gender and social support programs.' },
  { name: 'Finance, Trade, Industry, Labour and Cooperative Development', description: 'Oversees finance, trade, industry, labour and cooperative development.' },
  { name: 'Water, Environment and Natural Resources', description: 'Handles water resources, environment and natural resources management.' },
  { name: 'Speaker’s Panel', description: 'Provides guidance and support for the Speaker’s duties and functions.' },
  { name: 'Speaker’s Committee', description: 'Supports the Speaker in managing assembly business and privileges.' },
  { name: 'County Assembly House Business Committee', description: 'Schedules assembly business and manages the House agenda.' },
  { name: 'County Assembly Liaison Committee', description: 'Coordinates between the assembly and executive agencies.' },
  { name: 'Committee of Selection', description: 'Selects members for assembly committees and panels.' },
  { name: 'County Assembly Privileges Committee', description: 'Handles assembly privileges, ethics and member conduct.' },
  { name: 'County Assembly Procedure and Rules Committee', description: 'Advises on assembly procedure, rules and standing orders.' },
  { name: 'County Assembly Public Accounts Committee', description: 'Reviews public accounts and audit reports for accountability.' },
  { name: 'County Assembly Public Investments', description: 'Monitors public investment projects and financial performance.' },
  { name: 'County Committee on Delegated Legislation', description: 'Reviews delegated legislation and regulatory compliance.' },
  { name: 'County Committee on Justice and Legal Affairs', description: 'Addresses legal affairs, justice policy and county legislation.' },
  { name: 'County Assembly Committee on Implementation', description: 'Tracks implementation of assembly decisions and resolutions.' },
  { name: 'Committee on Appointments', description: 'Reviews and vets appointments made by the county executive.' },
  { name: 'Committee on Members Services, Facilities and Welfare', description: 'Oversees member services, facilities and welfare support.' },
  { name: 'General Oversight Committee', description: 'Provides broad oversight across county assembly operations.' },
];

const handleAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const loadCommittee = async (req, res, next, id) => {
  const committee = await Committee.findById(id).populate('members chairperson viceChairperson clerk reports documents recommendations.by');
  if (!committee) {
    return res.status(404).json({ message: 'Committee not found' });
  }
  req.committee = committee;
  next();
};

router.param('id', handleAsync(loadCommittee));

router.get('/', verifyToken, handleAsync(async (req, res) => {
  let committees = await Committee.find().populate('members');
  if (committees.length === 0) {
    await Committee.insertMany(defaultCommittees);
    committees = await Committee.find().populate('members');
  }
  res.json(committees);
}));

router.get('/:id', verifyToken, (req, res) => {
  Meeting.find({ committee: req.committee._id })
    .populate('attendees attendance.user documents actionItems.assignedTo')
    .sort({ startTime: 1, date: 1 })
    .then((meetings) => {
      const committee = req.committee.toObject();
      const performance = summarizeCommitteePerformance(meetings, committee);
      res.json({
        ...committee,
        meetings,
        performance: {
          ...committee.performance,
          totalMeetings: performance.totalMeetings,
          overdueActions: performance.overdueActionItems,
          completedActions: performance.completedActionItems,
          pendingActions: performance.pendingActionItems,
          averageAttendance: performance.averageAttendance,
          updatedAt: performance.lastUpdated,
        },
      });
    })
    .catch((error) => res.status(500).json({ message: 'Error loading committee meetings', error: error.message }));
});

router.post('/', verifyToken, handleAsync(async (req, res) => {
  const committee = new Committee(req.body);
  await committee.save();
  res.status(201).json(committee);
}));

router.put('/:id', verifyToken, authorizeRoles('Super Admin', 'Clerk', 'Committee Officer', 'HR Officer'), handleAsync(async (req, res) => {
  Object.assign(req.committee, req.body);
  await req.committee.save();
  await req.committee.populate('members chairperson viceChairperson reports recommendations.by');
  res.json(req.committee);
}));

router.delete('/:id', verifyToken, authorizeRoles('Super Admin', 'Clerk'), handleAsync(async (req, res) => {
  await req.committee.remove();
  res.json({ message: 'Committee deleted successfully' });
}));

router.put('/:id/members', verifyToken, authorizeRoles('Super Admin', 'Clerk', 'Committee Officer', 'HR Officer'), handleAsync(async (req, res) => {
  const { members } = req.body;
  if (!Array.isArray(members)) {
    return res.status(400).json({ message: 'Members array required' });
  }
  req.committee.members = members;
  await req.committee.save();
  await req.committee.populate('members chairperson viceChairperson');
  res.json(req.committee);
}));

router.post('/:id/meetings', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), handleAsync(async (req, res) => {
  const meetingData = { ...req.body, committee: req.committee._id };
  if (meetingData.attendees && Array.isArray(meetingData.attendees)) {
    meetingData.attendance = meetingData.attendees.map((user) => ({ user, status: 'Confirmed' }));
  }
  const meeting = new Meeting(meetingData);
  await meeting.save();
  await meeting.populate('committee attendees attendance.user');

  req.committee.meetings = req.committee.meetings || [];
  req.committee.meetings.push({
    title: meeting.title,
    date: meeting.startTime || meeting.date,
    agenda: meeting.agenda,
    invitations: (meeting.attendees || []).map((user) => user?.full_name || user?.name || 'Member'),
    attendance: meeting.attendees || [],
    minutes: meeting.minutes || '',
    documents: meeting.documents || [],
    actionItems: meeting.actionItems || [],
  });
  req.committee.performance = summarizeCommitteePerformance(req.committee.meetings, req.committee);
  await req.committee.save();
  res.status(201).json(meeting);
}));

router.post('/:id/upload-report', verifyToken, authorizeRoles('Committee Officer', 'Clerk', 'Super Admin'), upload.single('file'), scanUploadedFiles, handleAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File required' });
  }
  const document = new Document({
    docNumber: `CM-${Date.now()}`,
    title: req.body.title || req.file.originalname,
    description: req.body.description || '',
    type: req.body.type || 'report',
    category: req.body.category || 'public',
    status: 'submitted',
    document_type: 'Committee Reports',
    owner: req.user._id,
    assignedTo: req.body.nextResponsibleOfficer || null,
    approvalHistory: [{
      action: 'submitted',
      by: req.user._id,
      comment: 'Committee report submitted for approval',
      nextResponsibleOfficer: req.body.nextResponsibleOfficer || null,
    }],
    department: req.body.department,
    files: [{ path: req.file.path, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype }],
  });
  await document.save();
  req.committee.reports.push(document._id);
  await req.committee.save();
  await req.committee.populate('reports');
  res.status(201).json({ committee: req.committee, document });
}));

router.post('/:id/recommendations', verifyToken, authorizeRoles('Committee Officer', 'Clerk', 'Super Admin', 'MCA'), handleAsync(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Recommendation text required' });
  }
  req.committee.recommendations.push({ text, by: req.user._id });
  await req.committee.save();
  await req.committee.populate('recommendations.by');
  res.json(req.committee);
}));

router.post('/:id/action-items', verifyToken, authorizeRoles('Committee Officer', 'Clerk', 'Super Admin'), handleAsync(async (req, res) => {
  const { title, description, responsiblePerson, dueDate, status } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Action item title required' });
  }

  const item = {
    title,
    description,
    responsiblePerson,
    dueDate,
    status: status || 'Pending',
  };

  const meeting = req.body.meetingId ? await Meeting.findOne({ _id: req.body.meetingId, committee: req.committee._id }) : null;
  if (!meeting) {
    return res.status(400).json({ message: 'A valid committee meeting is required' });
  }
  meeting.actionItems = meeting.actionItems || [];
  meeting.actionItems.push({
    title,
    notes: description,
    assignedTo: responsiblePerson,
    deadline: dueDate,
    status: status || 'Pending',
  });
  await meeting.save();

  const meetings = await Meeting.find({ committee: req.committee._id }).lean();
  const summary = summarizeCommitteePerformance(meetings, req.committee);
  req.committee.performance = {
    totalMeetings: summary.totalMeetings,
    overdueActions: summary.overdueActionItems,
    completedActions: summary.completedActionItems,
    averageAttendance: summary.averageAttendance,
    updatedAt: summary.lastUpdated,
  };
  await req.committee.save();
  res.status(201).json({ committee: req.committee, meeting, item });
}));

router.get('/:id/performance', verifyToken, handleAsync(async (req, res) => {
  const meetings = await Meeting.find({ committee: req.committee._id }).lean();
  const summary = summarizeCommitteePerformance(meetings, req.committee.toObject());
  req.committee.performance = summary;
  await req.committee.save();
  res.json(summary);
}));

module.exports = router;
