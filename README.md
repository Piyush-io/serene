# Serene – AI Assisted serene reading platform

This project is a full-stack application for viewing, annotating, and processing documents (PDF/Markdown) with AI-powered features (summarization, rephrasing, etc.), robust image handling, and secure authentication.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables (Production)](#environment-variables-production)
  - [Frontend (`readeasy-next`)](#frontend-readeasy-next)
  - [Backend (`readeasy-backend`)](#backend-readeasy-backend)
- [Running the App](#running-the-app)
- [Image Storage & API](#image-storage--api)
- [AI & API Keys](#ai--api-keys)
- [Testing](#testing)
- [Future Improvements](#future-improvements)

---

## Project Structure

```
.
├── readeasy-next/      # Next.js frontend
├── readeasy-backend/   # FastAPI backend
├── readeasy/           # (Legacy/other code, not primary)
```

---

## Setup & Installation

### Backend

```bash
cd readeasy-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Set environment variables (see below)
uvicorn main:app --reload
```

### Frontend

```bash
cd readeasy-next
npm install
# Set environment variables (see below)
npm run dev
```

---

## Environment Variables (Production)

### Frontend (`readeasy-next`)

Set these in your deployment environment or in a `.env.local` file:

| Variable                                 | Required | Description                                 |
|-------------------------------------------|----------|---------------------------------------------|
| `NEXT_PUBLIC_BACKEND_URL`                 | Yes      | URL of the backend API (e.g. `https://api.example.com`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY`            | Yes      | Firebase web API key                        |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`        | Yes      | Firebase Auth domain                        |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`         | Yes      | Firebase project ID                         |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`     | Yes      | Firebase storage bucket                     |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Yes      | Firebase messaging sender ID                 |
| `NEXT_PUBLIC_FIREBASE_APP_ID`             | Yes      | Firebase app ID                             |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`     | No       | Firebase measurement ID (optional)          |
| `NEXTAUTH_SECRET`                         | Yes      | Secret for NextAuth JWT signing             |
| `NEXT_PUBLIC_APP_URL`                     | Yes      | The public URL of your frontend (for CORS)  |
| `JWT_SECRET`                              | Yes      | Secret for JWT token verification           |
| `NODE_ENV`                                | Yes      | Set to `production` in production           |

### Backend (`readeasy-backend`)

Set these in your deployment environment or in a `.env` file:

| Variable                        | Required | Description                                 |
|----------------------------------|----------|---------------------------------------------|
| `SECRET_KEY`                     | Yes      | Secret for JWT signing                      |
| `ACCESS_TOKEN_EXPIRE_MINUTES`    | No       | JWT expiration (default: 30)                |
| `CORS_ORIGINS`                   | Yes      | Comma-separated list of allowed origins     |
| `MISTRAL_API_KEY`                | No       | API key for Mistral AI (if used)            |
| `MISTRAL_API_URL`                | No       | Mistral API URL (default provided)          |
| `GOOGLE_API_KEY`                 | No       | API key for Google GenAI (if used)          |
| `FIREBASE_SERVICE_ACCOUNT_FILE_PATH` | Yes  | Path to Firebase service account JSON       |
| `FIREBASE_PROJECT_ID`            | Yes      | Firebase project ID                         |
| `REDIS_HOST`                     | No       | Redis host (default: localhost)             |
| `REDIS_PORT`                     | No       | Redis port (default: 6379)                  |
| `REDIS_DB`                       | No       | Redis DB index (default: 0)                 |
| `REDIS_PASSWORD`                 | No       | Redis password (if set)                     |
| `UPSTASH_REDIS_URL`              | No       | Upstash Redis URL (if used)                 |
| `UPSTASH_REDIS_TOKEN`            | No       | Upstash Redis token (if used)               |
| `USE_UPSTASH`                    | No       | Set to `true` to use Upstash                |
| `PROCESSING_RESULT_EXPIRATION_SECONDS` | No | Cache expiration (default: 86400)           |
| `ENVIRONMENT`                    | Yes      | Set to `production` in production           |
| `RATE_LIMIT_PER_MINUTE`          | No       | API rate limit (default: 60)                |
| `BACKEND_URL`                    | Yes      | Public URL of backend (for image links)     |
| `PORT`                           | No       | Port for backend server (default: 8001)     |
| `HOST`                           | No       | Host for backend server (default: 0.0.0.0)  |

---

## Running the App

1. **Start the backend** (`uvicorn main:app --host 0.0.0.0 --port 8001`)
2. **Start the frontend** (`npm run build && npm start` for production)

---

## Image Storage & API

### **DO NOT DELETE readeasy-backend/static/temp_images**

- Images are stored on the backend and served via `/api/v1/images/{filename}`.
- The frontend references images using API URLs and handles authentication tokens for protected images.
- See [readeasy-backend/README_IMAGES.md](readeasy-backend/README_IMAGES.md) for more details.

---

## AI & API Keys

- For AI features (summarization, rephrasing, etc.), set `GOOGLE_API_KEY`, `MISTRAL_API_KEY`, or `TOGETHER_API_KEY` as needed.
- If not set, those features will be limited or unavailable.

---

## Testing

- Backend: `pytest` or run test scripts as needed.
- Frontend: `npm run lint` and manual testing.

---

## Future Improvements

- Image optimization and CDN support
- Enhanced security for image endpoints
- More AI providers and fallback logic
- Better error handling and observability

---

**For more details, see code comments and the [readeasy-backend/README_IMAGES.md](readeasy-backend/README_IMAGES.md) for image handling specifics.** 