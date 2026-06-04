const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Role = require('../models/Role');
const User = require('../models/User');
const Department = require('../models/Department');
const Committee = require('../models/Committee');

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    const roleNames = [
      'Super Admin',
      'ICT Admin',
      'HR Officer',
      'Clerk',
      'Finance Officer',
      'Committee Officer',
      'Intern',
      'Security Officer',
    ];

    for (const name of roleNames) {
      await Role.findOneAndUpdate(
        { name },
        { name, description: `${name} role` },
        { upsert: true, new: true }
      );
    }

    const departmentNames = [
      { name: 'Clerks/Administration', description: 'Clerks and administration services' },
      { name: 'Human Resources', description: 'Human resources and staff management' },
      { name: 'Finance', description: 'Financial planning and management' },
      { name: 'Procurement', description: 'Procurement and supply chain' },
      { name: 'ICT/Hansard & Research', description: 'Information technology, Hansard records, and research' },
      { name: 'Serjeant-at-Arms', description: 'Serjeant-at-Arms office and security' },
      { name: 'Internal Audit', description: 'Internal audit and compliance' },
      { name: 'Works', description: 'Works and maintenance services' },
    ];

    let department;
    for (const dept of departmentNames) {
      const createdDept = await Department.findOneAndUpdate(
        { name: dept.name },
        { name: dept.name, description: dept.description },
        { upsert: true, new: true }
      );
      if (dept.name === 'Clerks/Administration') {
        department = createdDept;
      }
    }

    // Seed committees
    const committeeNames = [
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

    for (const committee of committeeNames) {
      await Committee.findOneAndUpdate(
        { name: committee.name },
        { name: committee.name, description: committee.description },
        { upsert: true, new: true }
      );
    }

    console.log('Committees seeded successfully.');

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@icams.local';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
    const adminName = process.env.SEED_ADMIN_NAME || 'Leonard Juma';

    const adminRoleNames = [
      'Super Admin',
      'ICT Admin',
      'HR Officer',
      'Clerk',
      'Finance Officer',
      'Committee Officer',
      'Procurement Officer',
      'Security Officer',
    ];
    const adminRoles = await Role.find({ name: { $in: adminRoleNames } });
    const adminRoleIds = adminRoles.map((role) => role._id);

    if (adminRoleIds.length > 0) {
      await User.deleteMany({ role: { $in: adminRoleIds } });
      console.log('Removed existing admin-level user accounts.');
    }

    const adminRole = await Role.findOne({ name: 'Super Admin' });
    const hashed = await bcrypt.hash(adminPassword, 12);
    const admin = new User({
      name: adminName,
      email: adminEmail,
      password: hashed,
      role: adminRole._id,
      department: department._id,
    });
    await admin.save();
    console.log(`Created Super Admin user: ${adminEmail}`);
    console.log(`Use password: ${adminPassword}`);

    console.log('Role seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
