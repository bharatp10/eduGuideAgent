const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001; // Changed default port to 5001

// Middleware
app.use(cors());
app.use(bodyParser.json());

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

// Routes
app.get('/api/resources', async (req, res) => {
    try {
        const resources = await Resource.find();
        res.json(resources);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/resources', async (req, res) => {
    try {
        const newResource = new Resource(req.body);
        await newResource.save();
        res.status(201).json(newResource);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Refactored Semantic Search Endpoint to use Gemini API
app.post('/api/semantic-search', async (req, res) => {
    try {
        const { query } = req.body;

        // Example: Use Gemini API for semantic search (mocked for now)
        const response = await axios.post('https://api.gemini.com/v1/semantic-search', {
            query
        }, {
            headers: {
                'Authorization': `Bearer ${GEMINI_API_KEY}`
            }
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Refactored Recommendation Endpoint to use Gemini API
app.get('/api/recommendations', async (req, res) => {
    try {
        const { grade, subject } = req.query;

        // Example: Use Gemini API for recommendations (mocked for now)
        const response = await axios.get('https://api.gemini.com/v1/recommendations', {
            params: { grade, subject },
            headers: {
                'Authorization': `Bearer ${GEMINI_API_KEY}`
            }
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Example usage of GEMINI_API_KEY
app.get('/api/gemini-example', async (req, res) => {
    try {
        // Replace with actual Gemini API endpoint and logic
        const response = await axios.get('https://api.gemini.com/v1/example', {
            headers: {
                'Authorization': `Bearer ${GEMINI_API_KEY}`
            }
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
