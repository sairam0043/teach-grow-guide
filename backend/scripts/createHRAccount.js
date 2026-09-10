require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../schemas/userSchema');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

const email = 'hr@cuvasol.com';
const rawPassword = 'hr@cuvasol123';
const fullName = 'Cuvasol HR & Finance Manager';
const role = 'hr';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB. Creating/updating HR user...');
    
    try {
      let user = await User.findOne({ email: email.toLowerCase() });
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);

      if (user) {
        console.log(`User ${email} already exists. Updating credentials and role...`);
        user.password = hashedPassword;
        user.role = role;
        user.full_name = user.full_name || fullName;
        await user.save();
        console.log('HR user updated successfully!');
      } else {
        console.log(`Creating new HR user ${email}...`);
        user = new User({
          email: email.toLowerCase(),
          password: hashedPassword,
          full_name: fullName,
          role: role,
          phone: '9999999999'
        });
        await user.save();
        console.log('HR user created successfully!');
      }

      console.log('--- HR ACCOUNT CREDENTIALS ---');
      console.log('Email:', user.email);
      console.log('Password:', rawPassword);
      console.log('Role:', user.role);
      console.log('Dashboard:', '/dashboard/hr');
      console.log('------------------------------');
    } catch (err) {
      console.error('Error creating/updating HR user:', err);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
