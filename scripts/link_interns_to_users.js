const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Intern = require('../models/Intern');
const User = require('../models/User');

dotenv.config();

const escapeRegExp = (string) => String(string).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

async function run() {
  const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/icams';
  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

    const interns = await Intern.find({ $or: [{ user: { $exists: false } }, { user: null }] }).lean();
  console.log(`Found ${interns.length} interns without linked user`);

  let linked = 0;
  for (const intern of interns) {
    if (!intern.email) {
      console.log(`Skipping intern ${intern._id} because email is missing`);
      continue;
    }
    const normalizedEmail = String(intern.email).trim();
    const user = await User.findOne({ email: { $regex: `^${escapeRegExp(normalizedEmail)}$`, $options: 'i' } });
    if (user) {
      await Intern.updateOne({ _id: intern._id }, { $set: { user: user._id } });
      console.log(`Linked intern ${intern._id} -> user ${user._id}`);
      linked++;
    } else {
      console.log(`No matching user found for intern ${intern._id} (${normalizedEmail})`);
    }
  }

  console.log(`Linked ${linked} interns`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });