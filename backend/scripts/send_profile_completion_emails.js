const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const { sendProfileReminderEmail } = require('../utils/emailService');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const testEmailArg = args.find(a => a.startsWith('--test='));
  const testEmail = testEmailArg ? testEmailArg.split('=')[1] : null;

  console.log('==================================================');
  console.log('  Cuvasol Tutor - Send Board & Class Profile Mail ');
  console.log('==================================================');
  if (isDryRun) console.log('MODE: DRY RUN (No emails will actually be sent)');
  if (testEmail) console.log(`MODE: TEST EMAIL ONLY -> Target: ${testEmail}`);
  console.log('');

  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('ERROR: MONGO_URI is missing in .env file!');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(' Connected to MongoDB database.\n');

  const users = await User.find({});
  const tutors = await Tutor.find({});

  const tutorMap = new Map();
  tutors.forEach(t => {
    if (t.userId) {
      tutorMap.set(t.userId.toString(), t);
    }
  });

  console.log(`Found ${users.length} registered users and ${tutors.length} tutor records.\n`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  const targetUsers = testEmail ? users.filter(u => u.email.toLowerCase() === testEmail.toLowerCase()) : users;

  if (testEmail && targetUsers.length === 0) {
    console.log(`⚠️ User with email ${testEmail} not found in database. Creating temporary user object for test...`);
    targetUsers.push({
      full_name: 'Test Member',
      email: testEmail,
      role: 'tutor',
    });
  }

  for (let i = 0; i < targetUsers.length; i++) {
    const user = targetUsers[i];
    const isTutor = user.role === 'tutor';
    const tutorDoc = isTutor ? (tutorMap.get(user._id ? user._id.toString() : '') || tutors.find(t => t.name === user.full_name)) : null;

    const missingFields = [];

    if (isTutor) {
      if (!tutorDoc || !tutorDoc.boardsTaught || tutorDoc.boardsTaught.length === 0) {
        missingFields.push('Board Taught (e.g. CBSE, ICSE, State Board, IB)');
      }
      if (!tutorDoc || !tutorDoc.classesTaught || tutorDoc.classesTaught.length === 0) {
        missingFields.push('Class / Grade Taught (e.g. Class 1-12, College)');
      }
      if (!user.phone || user.phone.trim() === '') {
        missingFields.push('Phone Number');
      }
      if (!tutorDoc || !tutorDoc.city || tutorDoc.city.trim() === '') {
        missingFields.push('City / Location');
      }
      if (!tutorDoc || !tutorDoc.qualification || tutorDoc.qualification.trim() === '') {
        missingFields.push('Qualification');
      }
      if (!tutorDoc || !tutorDoc.subjects || tutorDoc.subjects.length === 0) {
        missingFields.push('Subjects Offered');
      }
      if (!tutorDoc || !tutorDoc.bio || tutorDoc.bio.trim() === '') {
        missingFields.push('Profile Bio / Description');
      }
    } else {
      if (!user.student_class || user.student_class.trim() === '') {
        missingFields.push('Class / Grade Level');
      }
      if (!user.phone || user.phone.trim() === '') {
        missingFields.push('Phone Number');
      }
    }

    let frontendUrl = 'https://tutor.cuvasol.com';
    if (process.env.FRONTEND_URL) {
      const urls = process.env.FRONTEND_URL.split(',')
        .map(u => u.replace(/["']/g, '').trim())
        .filter(Boolean);
      const prodUrl = urls.find(url => !url.includes('localhost') && !url.includes('127.0.0.1'));
      if (prodUrl) frontendUrl = prodUrl;
    }

    console.log(`[${i + 1}/${targetUsers.length}] Processing ${user.full_name} (${user.email}) - Role: ${user.role}`);
    console.log(`    Missing fields (${missingFields.length}): ${missingFields.join(', ') || 'None (Profile Complete)'}`);

    if (isDryRun) {
      successCount++;
      continue;
    }

    try {
      await sendProfileReminderEmail({
        name: user.full_name,
        email: user.email,
        role: user.role,
        missingFields,
        frontendUrl,
      });
      console.log(`    ✅ Sent reminder email to ${user.email}`);
      successCount++;
    } catch (err) {
      console.error(`    ❌ Failed to send email to ${user.email}: ${err.message}`);
      failCount++;
    }

    // Rate limiting delay (350ms per email to avoid SMTP quota throttling)
    await delay(350);
  }

  console.log('\n==================================================');
  console.log('  Execution Summary');
  console.log('==================================================');
  console.log(`Total Members Processed: ${targetUsers.length}`);
  console.log(`Emails Sent Successfully: ${successCount}`);
  console.log(`Failed Email Deliveries: ${failCount}`);
  console.log(`Skipped: ${skippedCount}`);

  await mongoose.connection.close();
  console.log('Database connection closed. Done!');
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
