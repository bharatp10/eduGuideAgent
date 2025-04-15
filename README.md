# eduGuideAgent

This project consists of a backend (Node.js + Express + MongoDB) and a frontend (React) for managing educational resources.

## Deployment Steps

### Backend
1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file in the `backend` folder with the following content:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ```
3. Populate the database with sample data:
   ```bash
   node populateData.js
   ```
4. Start the backend server:
   ```bash
   node server.js
   ```

### Frontend
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the frontend development server:
   ```bash
   npm start
   ```

### Full Stack
- Ensure the backend is running on `http://localhost:5000`.
- The frontend will proxy API requests to the backend.

## Testing
1. Open the frontend in your browser (usually at `http://localhost:3000`).
2. Verify that the sample resources are displayed.
3. Add a new resource using the form and ensure it appears in the list.

## Maintenance
- **Backend**:
  - Monitor logs for errors.
  - Update dependencies regularly.
  - Backup the MongoDB database periodically.

- **Frontend**:
  - Test UI changes in multiple browsers.
  - Update dependencies regularly.

- **General**:
  - Use a CI/CD pipeline for automated testing and deployment.
  - Document any changes to the API or UI.

## Notes
- Replace `your_mongodb_connection_string` with your actual MongoDB URI.
- For production, consider using a process manager like `PM2` for the backend and a static file server for the frontend.
