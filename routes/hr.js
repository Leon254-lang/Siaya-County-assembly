const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const Appraisal = require('../models/Appraisal');
const SelfAssessment = require('../models/SelfAssessment');
const User = require('../models/User');
const Role = require('../models/Role');
const Leave = require('../models/Leave');
const Vacancy = require('../models/Vacancy');
const Application = require('../models/Application');
const Training = require('../models/Training');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Setup multer for HR uploads
const hrUploadDir = path.join(__dirname, '..', 'uploads', 'hr');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, hrUploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Dashboard summary
router.get('/dashboard', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({});
    const pendingLeaveRequests = await Leave.countDocuments({ status: 'pending' });
    const now = new Date();
    const employeesOnLeave = await Leave.countDocuments({ status: 'approved', startDate: { $lte: now }, endDate: { $gte: now } });
    const newApplications = await Application.countDocuments({ status: 'pending' });
    const internsCount = await User.countDocuments().where('role').in([await Role.findOne({ name: 'Intern' }).then(r => r ? r._id : null)]);

    // upcoming contract expiries / retirements - best-effort: users with contractEnd / retirementDate fields
    const upcomingExpiries = await User.find({ contractEnd: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } }).countDocuments();
    const upcomingRetirements = await User.find({ retirementDate: { $gte: now, $lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) } }).countDocuments();

    res.json({ totalEmployees, employeesOnLeave, pendingLeaveRequests, newApplications, internsCount, upcomingExpiries, upcomingRetirements });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate HR dashboard', error: error.message });
  }
});

// Employee management
router.get('/employees', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const users = await User.find().populate('role department').sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load employees', error: error.message });
  }
});

router.get('/employees/:id', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('role department');
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load employee', error: error.message });
  }
});

router.post('/employees', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { name, email, password, roleName, phone, department } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const role = await Role.findOne({ name: roleName }) || await Role.findOne({ name: 'Clerk' });
    const hashed = await bcrypt.hash(password || 'ChangeMe123!', 10);
    const user = new User({ name, email, password: hashed, role: role._id, phone, department });
    await user.save();
    res.status(201).json(await User.findById(user._id).populate('role department'));
  } catch (error) {
    res.status(500).json({ message: 'Failed to create employee', error: error.message });
  }
});

router.put('/employees/:id', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.roleName) {
      const role = await Role.findOne({ name: updates.roleName });
      if (role) updates.role = role._id;
      delete updates.roleName;
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('role department');
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update employee', error: error.message });
  }
});

router.patch('/employees/:id/transfer', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { department } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { department }, { new: true }).populate('role department');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Transfer failed', error: error.message });
  }
});

router.patch('/employees/:id/promote', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { roleName } = req.body;
    const role = await Role.findOne({ name: roleName });
    if (!role) return res.status(400).json({ message: 'Role not found' });
    const user = await User.findByIdAndUpdate(req.params.id, { role: role._id }, { new: true }).populate('role department');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Promotion failed', error: error.message });
  }
});

router.patch('/employees/:id/suspend', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false, suspendedReason: reason }, { new: true }).populate('role department');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Suspend failed', error: error.message });
  }
});

router.patch('/employees/:id/deactivate', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false, deactivatedReason: reason, deactivatedAt: new Date() }, { new: true }).populate('role department');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Deactivate failed', error: error.message });
  }
});

// Upload employee documents
router.post('/employees/:id/documents', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    user.documents = user.documents || [];
    user.documents.push({ filename: req.file.filename, path: `/uploads/hr/${req.file.filename}`, type: req.body.type || 'other' });
    await user.save();
    res.json(user.documents[user.documents.length - 1]);
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Leave approval endpoints
router.patch('/leave/:id/approve', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: 'Approval failed', error: error.message });
  }
});

router.patch('/leave/:id/reject', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { comments } = req.body;
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status: 'rejected', comments }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: 'Reject failed', error: error.message });
  }
});

// Recruitment - vacancies
router.get('/vacancies', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const vacs = await Vacancy.find().sort({ createdAt: -1 });
    res.json(vacs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load vacancies', error: error.message });
  }
});

router.post('/vacancies', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const data = { ...req.body, postedBy: req.user._id, postedAt: new Date() };
    const vac = new Vacancy(data);
    await vac.save();
    res.status(201).json(vac);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create vacancy', error: error.message });
  }
});

router.put('/vacancies/:id', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const vac = await Vacancy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(vac);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update vacancy', error: error.message });
  }
});

router.post('/vacancies/:id/publish', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const vac = await Vacancy.findByIdAndUpdate(req.params.id, { status: 'open', postedAt: new Date() }, { new: true });
    res.json(vac);
  } catch (error) {
    res.status(500).json({ message: 'Publish failed', error: error.message });
  }
});

router.post('/vacancies/:id/close', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const vac = await Vacancy.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
    res.json(vac);
  } catch (error) {
    res.status(500).json({ message: 'Close failed', error: error.message });
  }
});

// Applications
router.post('/vacancies/:id/apply', upload.single('resume'), async (req, res) => {
  try {
    const vacancy = await Vacancy.findById(req.params.id);
    if (!vacancy) return res.status(404).json({ message: 'Vacancy not found' });
    const appData = {
      vacancy: vacancy._id,
      applicantName: req.body.applicantName,
      email: req.body.email,
      phone: req.body.phone,
      coverLetter: req.body.coverLetter,
    };
    if (req.file) appData.resume = { filename: req.file.filename, path: `/uploads/hr/${req.file.filename}` };
    const application = new Application(appData);
    await application.save();
    vacancy.applicationsCount = (vacancy.applicationsCount || 0) + 1;
    await vacancy.save();
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Application failed', error: error.message });
  }
});

router.get('/applications', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const apps = await Application.find().populate('vacancy').sort({ appliedAt: -1 });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load applications', error: error.message });
  }
});

router.patch('/applications/:id/shortlist', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const app = await Application.findByIdAndUpdate(req.params.id, { status: 'shortlisted' }, { new: true });
    res.json(app);
  } catch (error) {
    res.status(500).json({ message: 'Shortlist failed', error: error.message });
  }
});

router.patch('/applications/:id/schedule', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { interviewDate } = req.body;
    const app = await Application.findByIdAndUpdate(req.params.id, { interviewDate, status: 'interview_scheduled' }, { new: true });
    res.json(app);
  } catch (error) {
    res.status(500).json({ message: 'Schedule failed', error: error.message });
  }
});

router.patch('/applications/:id/result', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { status, interviewNotes } = req.body;
    const app = await Application.findByIdAndUpdate(req.params.id, { status, interviewNotes }, { new: true });
    res.json(app);
  } catch (error) {
    res.status(500).json({ message: 'Result update failed', error: error.message });
  }
});

// Training endpoints
router.post('/trainings', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const training = new Training(req.body);
    await training.save();
    res.status(201).json(training);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create training', error: error.message });
  }
});

router.get('/trainings', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const trainings = await Training.find().populate('participants').sort({ createdAt: -1 });
    res.json(trainings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load trainings', error: error.message });
  }
});

// Keep existing appraisal/self-assessment routes
router.get('/appraisals', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const appraisals = await Appraisal.find().sort({ createdAt: -1 });
    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load appraisals', error: error.message });
  }
});

router.post('/appraisals', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const appraisal = new Appraisal(req.body);
    await appraisal.save();
    res.status(201).json(appraisal);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create appraisal', error: error.message });
  }
});

router.put('/appraisals/:id', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update appraisal', error: error.message });
  }
});

router.get('/self-assessments', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const assessments = await SelfAssessment.find().sort({ createdAt: -1 });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load self assessments', error: error.message });
  }
});

router.post('/self-assessments', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const assessment = new SelfAssessment(req.body);
    await assessment.save();
    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit self assessment', error: error.message });
  }
});

module.exports = router;
