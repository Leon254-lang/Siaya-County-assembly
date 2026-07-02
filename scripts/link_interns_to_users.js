const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Intern = require('../models/Intern');
const User = require('../models/User');

dotenv.config();

async function run() {
  const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/icams';
  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const interns = await Intern.find({ user: { $exists: false } }).lean();
  console.log(`Found ${interns.length} interns without linked user`);

  let linked = 0;
  for (const intern of interns) {
    if (!intern.email) continue;
    const user = await User.findOne({ email: intern.email });
    if (user) {
      await Intern.updateOne({ _id: intern._id }, { $set: { user: user._id } });
      console.log(`Linked intern ${intern._id} -> user ${user._id}`);
      linked++;
    }
  }

  console.log(`Linked ${linked} interns`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });