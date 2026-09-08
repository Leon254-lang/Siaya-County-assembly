const express = require('express');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const router = express.Router();
const Hansard = require('../models/Hansard');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

const editors = ['Clerk', 'Committee Officer', 'Super Admin'];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const populateHansard = (query) => query
  .populate('createdBy approvedBy sitting')
  .populate('entries.speaker entries.member')
  .populate('versions.changedBy');

const normaliseContribution = (entry, sequence) => {
  const contribution = {
    speakerName: entry.speakerName || '',
    role: entry.role || '',
    member: entry.member || undefined,
    text: entry.text,
    timestamp: entry.timestamp || new Date(),
    sequence,
  };
  if (entry.speaker && mongoose.Types.ObjectId.isValid(entry.speaker)) contribution.speaker = entry.speaker;
  if (!contribution.speakerName && entry.speaker && !mongoose.Types.ObjectId.isValid(entry.speaker)) contribution.speakerName = entry.speaker;
  return contribution;
};

const snapshot = (record, userId, changeNote) => ({
  version: record.currentVersion || 1,
  entries: record.entries.map((entry) => entry.toObject()),
  changedBy: userId,
  changeNote,
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const query = {};
    if (req.query.sitting) query.sitting = req.query.sitting;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) query.title = new RegExp(escapeRegex(req.query.search), 'i');
    if (req.query.speaker) {
      const pattern = new RegExp(escapeRegex(req.query.speaker), 'i');
      query.$or = [{ 'entries.speakerName': pattern }, { 'entries.role': pattern }];
      if (mongoose.Types.ObjectId.isValid(req.query.speaker)) query.$or.push({ 'entries.speaker': req.query.speaker }, { 'entries.member': req.query.speaker });
    }
    const records = await populateHansard(Hansard.find(query).sort({ sessionDate: -1, createdAt: -1 }));
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load Hansard', error: error.message });
  }
});

router.get('/:id/pdf', verifyToken, async (req, res) => {
  try {
    const record = await populateHansard(Hansard.findById(req.params.id));
    if (!record) return res.status(404).json({ message: 'Hansard record not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${record.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf"`);
    const pdf = new PDFDocument({ margin: 54 });
    pdf.pipe(res);
    pdf.fontSize(16).font('Helvetica-Bold').text('SIAYA COUNTY ASSEMBLY', { align: 'center' });
    pdf.moveDown(0.4).fontSize(14).text('HANSARD REPORT', { align: 'center' });
    pdf.moveDown(0.4).fontSize(11).font('Helvetica').text(record.title, { align: 'center' });
    pdf.text(new Date(record.sessionDate).toLocaleDateString('en-GB', { dateStyle: 'full' }), { align: 'center' });
    pdf.moveDown(1).moveTo(54, pdf.y).lineTo(558, pdf.y).stroke();
    pdf.moveDown(1);
    record.entries.forEach((entry) => {
      const speaker = entry.speaker?.name || entry.member?.name || entry.speakerName || 'Unknown speaker';
      const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
      pdf.fontSize(10).font('Helvetica-Bold').text(`${time}  ${speaker}${entry.role ? ` (${entry.role})` : ''}`);
      pdf.font('Helvetica').fontSize(11).text(entry.text, { paragraphGap: 8 });
      pdf.moveDown(0.5);
    });
    pdf.end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate Hansard PDF', error: error.message });
  }
});

router.get('/:id/versions', verifyToken, async (req, res) => {
  try {
    const record = await Hansard.findById(req.params.id).select('currentVersion versions').populate('versions.changedBy');
    if (!record) return res.status(404).json({ message: 'Hansard record not found' });
    res.json({ currentVersion: record.currentVersion, versions: record.versions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load Hansard versions', error: error.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const record = await populateHansard(Hansard.findById(req.params.id));
    if (!record) return res.status(404).json({ message: 'Hansard record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load Hansard record', error: error.message });
  }
});

router.post('/', verifyToken, authorizeRoles(...editors), async (req, res) => {
  try {
    const entries = (req.body.entries || []).map((entry, index) => normaliseContribution(entry, index + 1));
    const record = new Hansard({ ...req.body, entries, createdBy: req.user._id, currentVersion: 1 });
    await record.save();
    await recordAudit({ req, action: 'Created Hansard record', entity: 'Hansard', entityId: record._id, details: { title: record.title } });
    res.status(201).json(await populateHansard(Hansard.findById(record._id)));
  } catch (error) {
    res.status(500).json({ message: 'Failed to create Hansard record', error: error.message });
  }
});

router.put('/:id', verifyToken, authorizeRoles(...editors), async (req, res) => {
  try {
    const record = await Hansard.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Hansard record not found' });
    if (record.status === 'Published' || record.status === 'Archived') return res.status(400).json({ message: 'Published or archived Hansard cannot be edited' });
    record.versions.push(snapshot(record, req.user._id, req.body.changeNote || 'Updated Hansard record'));
    record.currentVersion += 1;
    if (req.body.title !== undefined) record.title = req.body.title;
    if (req.body.sessionDate !== undefined) record.sessionDate = req.body.sessionDate;
    if (req.body.sessionType !== undefined) record.sessionType = req.body.sessionType;
    if (req.body.sitting !== undefined) record.sitting = req.body.sitting;
    if (req.body.notes !== undefined) record.notes = req.body.notes;
    if (Array.isArray(req.body.entries)) record.entries = req.body.entries.map((entry, index) => normaliseContribution(entry, index + 1));
    record.status = 'Draft';
    record.updatedAt = new Date();
    await record.save();
    res.json(await populateHansard(Hansard.findById(record._id)));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update Hansard record', error: error.message });
  }
});

router.post('/:id/entries', verifyToken, authorizeRoles(...editors), async (req, res) => {
  try {
    const record = await Hansard.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Hansard record not found' });
    if (record.status === 'Published' || record.status === 'Archived') return res.status(400).json({ message: 'Published or archived Hansard cannot be edited' });
    record.versions.push(snapshot(record, req.user._id, 'Added contribution'));
    record.currentVersion += 1;
    record.entries.push(normaliseContribution(req.body, record.entries.length + 1));
    record.status = 'Draft';
    await record.save();
    res.json(await populateHansard(Hansard.findById(record._id)));
  } catch (error) {
    res.status(500).json({ message: 'Failed to add Hansard contribution', error: error.message });
  }
});

router.patch('/:id/approve', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  try {
    const record = await Hansard.findByIdAndUpdate(req.params.id, { status: 'Approved', approvedBy: req.user._id, updatedAt: new Date() }, { new: true });
    if (!record) return res.status(404).json({ message: 'Hansard record not found' });
    await recordAudit({ req, action: 'Approved Hansard record', entity: 'Hansard', entityId: record._id, details: { title: record.title } });
    res.json(await populateHansard(Hansard.findById(record._id)));
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve Hansard record', error: error.message });
  }
});

router.patch('/:id/publish', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  try {
    const record = await Hansard.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Hansard record not found' });
    if (!['Approved', 'Published'].includes(record.status)) return res.status(400).json({ message: 'Hansard must be approved before publication' });
    record.status = 'Published';
    record.approvedBy = record.approvedBy || req.user._id;
    record.publishedAt = new Date();
    await record.save();
    await recordAudit({ req, action: 'Published Hansard record', entity: 'Hansard', entityId: record._id, details: { title: record.title } });
    res.json(await populateHansard(Hansard.findById(record._id)));
  } catch (error) {
    res.status(500).json({ message: 'Failed to publish Hansard record', error: error.message });
  }
});

router.patch('/:id/archive', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  try {
    const record = await Hansard.findByIdAndUpdate(req.params.id, { status: 'Archived', updatedAt: new Date() }, { new: true });
    if (!record) return res.status(404).json({ message: 'Hansard record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Failed to archive Hansard record', error: error.message });
  }
});

module.exports = router;
