const express = require('express');
const Committee = require('../models/Committee');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const Meeting = require('../models/Meeting');
const Document = require('../models/Document');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

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

router.get('/', verifyToken, async (req, res) => {
  let committees = await Committee.find().populate('members');

  if (committees.length === 0) {
    await Committee.insertMany(defaultCommittees);
    committees = await Committee.find().populate('members');
  }

  res.json(committees);
});

router.post('/', verifyToken, async (req, res) => {
  const committee = new Committee(req.body);
  await committee.save();
  res.status(201).json(committee);
});

// Assign members to a committee (replace members list)
router.put('/:id/members', verifyToken, authorizeRoles('Super Admin', 'Clerk', 'Committee Officer', 'HR Officer'), async (req, res) => {
  const committee = await Committee.findById(req.params.id);
  if (!committee) return res.status(404).json({ message: 'Committee not found' });
  const { members } = req.body;
  if (!Array.isArray(members)) return res.status(400).json({ message: 'Members array required' });
  committee.members = members;
  await committee.save();
  await committee.populate('members');
  res.json(committee);
});

// Schedule a meeting for a committee
router.post('/:id/meetings', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  const committee = await Committee.findById(req.params.id);
  if (!committee) return res.status(404).json({ message: 'Committee not found' });

  const meetingData = { ...req.body, committee: committee._id };
  if (meetingData.attendees && Array.isArray(meetingData.attendees)) {
    meetingData.attendance = meetingData.attendees.map((user) => ({ user, status: 'Confirmed' }));
  }

  const meeting = new Meeting(meetingData);
  await meeting.save();
  await meeting.populate('committee attendees attendance.user');
  res.status(201).json(meeting);
});

// Upload a committee report and attach as a Document
router.post('/:id/upload-report', verifyToken, authorizeRoles('Committee Officer', 'Clerk', 'Super Admin'), upload.single('file'), async (req, res) => {
  try {
    const committee = await Committee.findById(req.params.id);
    if (!committee) return res.status(404).json({ message: 'Committee not found' });
    if (!req.file) return res.status(400).json({ message: 'File required' });

    const doc = new Document({
      docNumber: `CM-${Date.now()}`,
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      type: req.body.type || 'report',
      category: req.body.category || 'public',
      status: 'approved',
      owner: req.user._id,
      department: req.body.department,
      files: [{ path: req.file.path, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype }],
    });

    await doc.save();
    committee.reports.push(doc._id);
    await committee.save();
    await committee.populate('reports');

    res.status(201).json({ committee, document: doc });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload report', error: err.message });
  }
});

// Add a recommendation to a committee
router.post('/:id/recommendations', verifyToken, authorizeRoles('Committee Officer', 'Clerk', 'Super Admin', 'MCA'), async (req, res) => {
  const committee = await Committee.findById(req.params.id);
  if (!committee) return res.status(404).json({ message: 'Committee not found' });
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'Recommendation text required' });
  committee.recommendations.push({ text, by: req.user._id });
  await committee.save();
  await committee.populate('recommendations.by');
  res.json(committee);
});

module.exports = router;
