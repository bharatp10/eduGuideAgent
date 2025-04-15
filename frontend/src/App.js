import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
  const [resources, setResources] = useState([]);
  const [newResource, setNewResource] = useState({
    type: '',
    subject: '',
    grade: '',
    title: '',
    year: '',
    url: ''
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await axios.get('/api/resources');
      setResources(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const addResource = async () => {
    try {
      await axios.post('/api/resources', newResource);
      fetchResources();
      setNewResource({ type: '', subject: '', grade: '', title: '', year: '', url: '' });
    } catch (error) {
      console.error('Error adding resource:', error);
    }
  };

  return (
    <div>
      <h1>Resource Management</h1>

      <h2>Add New Resource</h2>
      <form onSubmit={(e) => { e.preventDefault(); addResource(); }}>
        <input type="text" placeholder="Type" value={newResource.type} onChange={(e) => setNewResource({ ...newResource, type: e.target.value })} required />
        <input type="text" placeholder="Subject" value={newResource.subject} onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })} required />
        <input type="number" placeholder="Grade" value={newResource.grade} onChange={(e) => setNewResource({ ...newResource, grade: e.target.value })} required />
        <input type="text" placeholder="Title" value={newResource.title} onChange={(e) => setNewResource({ ...newResource, title: e.target.value })} required />
        <input type="number" placeholder="Year" value={newResource.year} onChange={(e) => setNewResource({ ...newResource, year: e.target.value })} required />
        <input type="url" placeholder="URL" value={newResource.url} onChange={(e) => setNewResource({ ...newResource, url: e.target.value })} required />
        <button type="submit">Add Resource</button>
      </form>

      <h2>Resources</h2>
      <ul>
        {resources.map((resource, index) => (
          <li key={index}>
            {resource.type} - {resource.subject} - Grade {resource.grade} - {resource.title} ({resource.year}) - <a href={resource.url} target="_blank" rel="noopener noreferrer">Link</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
