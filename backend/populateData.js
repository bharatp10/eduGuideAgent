const mongoose = require('mongoose');
require('dotenv').config();

// Import the Resource model from server.js
const ResourceSchema = new mongoose.Schema({
    type: String,
    subject: String,
    grade: Number,
    title: String,
    year: Number,
    url: String
});

const Resource = mongoose.model('Resource', ResourceSchema);

// Sample data
const sampleResources = [
    {
        type: 'textbook',
        subject: 'maths',
        grade: 10,
        title: 'Advanced Algebra',
        year: 2024,
        url: 'https://example.com/algebra'
    },
    {
        type: 'question_paper',
        subject: 'science',
        grade: 9,
        title: 'Physics Final Exam',
        year: 2024,
        url: 'https://example.com/physics-exam'
    },
    {
        type: 'textbook',
        subject: 'science',
        grade: 10,
        title: 'Chemistry Basics',
        year: 2024,
        url: 'https://example.com/chemistry'
    }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('MongoDB Connected');
        
        try {
            // Clear existing data
            await Resource.deleteMany({});
            console.log('Cleared existing resources');

            // Insert sample data
            await Resource.insertMany(sampleResources);
            console.log('Sample data inserted successfully');
        } catch (error) {
            console.error('Error populating data:', error);
        } finally {
            // Close the connection
            mongoose.connection.close();
            console.log('Database connection closed');
        }
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });
