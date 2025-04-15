const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

// Models
const ResourceSchema = new mongoose.Schema({
    type: String, // 'textbook' or 'question_paper'
    subject: String, // 'maths' or 'science'
    grade: Number, // e.g., 10
    title: String,
    year: Number, // For question papers
    url: String // Link to the resource
});

const Resource = mongoose.model('Resource', ResourceSchema);

// Sample Data
const sampleData = [
    { type: 'textbook', subject: 'maths', grade: 10, title: 'CBSE Maths Textbook', year: 2025, url: 'http://example.com/maths-textbook' },
    { type: 'textbook', subject: 'science', grade: 10, title: 'CBSE Science Textbook', year: 2025, url: 'http://example.com/science-textbook' },
    { type: 'question_paper', subject: 'maths', grade: 10, title: 'Maths Question Paper 2024', year: 2024, url: 'http://example.com/maths-qp-2024' },
    { type: 'question_paper', subject: 'science', grade: 10, title: 'Science Question Paper 2024', year: 2024, url: 'http://example.com/science-qp-2024' },
    // Add more question papers for the last 10 years
];

// Populate Database
const populateData = async () => {
    try {
        await Resource.deleteMany(); // Clear existing data
        await Resource.insertMany(sampleData);
        console.log('Sample data inserted successfully');
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        mongoose.connection.close();
    }
};

populateData();
