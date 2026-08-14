const mongoose = require('./node_modules/mongoose');

async function checkRatings() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/teachgrow');
    const db = mongoose.connection.db;
    const tutors = await db.collection('tutors').find({}).toArray();
    console.log('Total tutors found:', tutors.length);
    
    const ratedTutors = tutors.filter(t => t.rating > 0 || t.reviewCount > 0);
    
    if (ratedTutors.length === 0) {
      console.log('There are NO tutors with any ratings yet.');
    } else {
      console.log('Tutors with ratings:');
      ratedTutors.forEach(t => {
        console.log(`- ${t.name}: Rating = ${t.rating}, Reviews = ${t.reviewCount}`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkRatings();
