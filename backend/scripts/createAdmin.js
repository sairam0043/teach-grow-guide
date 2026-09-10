// Script to create or update an admin user programmatically
// Usage: node backend/scripts/createAdmin.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../schemas/userSchema');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

const email = 'cuvasoltpl@gmail.com';
const rawPassword = 'saritha@cuvasol';
const fullName = 'Cuvasol Admin';
const role = 'admin';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB. Creating/updating admin user...');
    
    try {
      // Find existing user
      let user = await User.findOne({ email: email.toLowerCase() });
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);

      if (user) {
        console.log(`User ${email} already exists. Updating credentials and role...`);
        user.password = hashedPassword;
        user.role = role;
        user.full_name = user.full_name || fullName;
        await user.save();
        console.log('Admin user updated successfully!');
      } else {
        console.log(`Creating new admin user ${email}...`);
        user = new User({
          email: email.toLowerCase(),
          password: hashedPassword,
          full_name: fullName,
          role: role,
          phone: '0000000000'
        });
        await user.save();
        console.log('Admin user created successfully!');
      }
      console.log('User details:');
      console.log({
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      });
    } catch (err) {
      console.error('Error creating/updating admin user:', err);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
