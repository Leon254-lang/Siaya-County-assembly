const express = require('express');
const Committee = require('../models/Committee');
const { verifyToken } = require('../middleware/auth');

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

module.exports = router;
