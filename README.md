# eduGuideAgent

eduGuideAgent is a full-stack platform for managing, searching, and recommending educational resources. It features a secure Node.js/Express/MongoDB backend and a modern React frontend.

## Features
- **AI-powered semantic search** (OpenAI + Pinecone)
- **Personalized recommendations** based on user preferences and resource similarity
- **Secure PDF upload and storage** (Google Cloud Storage, encryption, access tokens)
- **Resource versioning** and rollback
- **Comprehensive audit logging** for all sensitive actions
- **Role-based access and rate limiting**
- **Compliance monitoring** (GDPR, SOC2, data retention)
- **Automated backups** (encrypted, cloud storage)
- **Responsive, accessible frontend** (React + MUI)

## Project Structure
- `backend/` — Node.js/Express API, MongoDB models, security, AI/ML services
- `frontend/` — React app (search, upload, recommendations, preferences)

## Backend Setup
1. Copy `.env.example` to `.env` in `backend/` and fill in all required values:
   ```env
   NODE_ENV=development
   PORT=5001
   MONGO_URI=your_mongodb_connection_string
   MONGO_USER=your_mongo_user
   MONGO_PASSWORD=your_secure_password
   GOOGLE_CLOUD_PROJECT=your_project_id
   GOOGLE_STORAGE_BUCKET=your_bucket_name
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   JWT_SECRET=your_jwt_secret
   CORS_ORIGIN=http://localhost:3000
   ENCRYPTION_ALGORITHM=aes-256-gcm
   FILE_ENCRYPTION_KEY_LENGTH=32
   # ...see .env.example for all options
   ```
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. (Optional) Populate the database with sample data:
   ```bash
   npm run populate
   ```
4. Start the backend server:
   ```bash
   npm start
   ```

## Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the frontend development server:
   ```bash
   npm start
   ```
   The frontend proxies API requests to the backend (see `frontend/package.json`).

## Docker
A multi-stage `Dockerfile` is provided for production builds. Example usage:
```powershell
# Build and run (from project root)
docker build -t eduguideagent .
docker run -p 5001:5001 --env-file backend/.env eduguideagent
```

## API Overview
- `POST /api/documents/upload` — Upload PDF resource (auth required)
- `GET /api/search` — Search resources (semantic + filters)
- `GET /api/documents/:id` — Get resource details (secure access)
- `GET /api/documents/:id/recommendations` — Get similar resources
- `GET /api/documents/:id/versions` — List versions
- `POST /api/documents/:id/revert/:version` — Revert to version
- `POST /api/audit` — Store audit log

## Frontend Features
- **Search**: Filter by subject, type, grade; semantic search
- **Upload**: Drag-and-drop PDF upload with metadata
- **Resource detail**: View/download, metadata, keywords
- **Recommendations**: Personalized and resource-based
- **User preferences**: Save and update interests, grade, subjects
- **Audit logging**: All key actions are logged

## Testing
- Backend: Add tests as needed (see scripts/)
- Frontend: Run `npm test` in `frontend/` (Jest + React Testing Library)

## Security & Compliance
- All uploads are encrypted and access-controlled
- Audit logs for all sensitive actions
- GDPR/SOC2 compliance monitoring (automated)
- Rate limiting, helmet, CORS, and input validation
- Automated security scans (see `.github/workflows/security-scan.yml`)

## Maintenance
- Monitor logs in `backend/logs/`
- Use `backend/config/backup.js` for encrypted backups
- Update dependencies regularly
- Use CI/CD for automated testing and deployment

## Notes
- Replace all placeholder values in `.env` with your actual credentials
- For production, use a process manager (e.g., PM2) and a static file server for the frontend
- See code comments and `.env.example` for advanced configuration
