# Docker Deployment Guide

This directory contains Docker configuration for the Bidding Game project.

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### 1. Configure Environment

Copy the example environment file and fill in your API keys:

```bash
cp .env.example .env
# Edit .env and add your DASHSCOPE_API_KEY
```

### 2. Build and Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### 3. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Documentation: http://localhost:8001/docs
- Health Check: http://localhost:8001/health
- Qdrant Dashboard: http://localhost:6333/dashboard

## Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| qdrant | qdrant/qdrant | 6333 | Vector database for embeddings |
| backend | Dockerfile.backend | 8001 | FastAPI application |
| frontend | Dockerfile.frontend | 3000 | Next.js application |

## Development Mode

For development with hot-reload, use the local development setup instead:

```bash
# Terminal 1: Backend
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Production Deployment

For production deployment:

1. Update `NEXT_PUBLIC_API_URL` in `docker-compose.yml` to your production backend URL
2. Set strong CORS origins in `.env`
3. Use a reverse proxy (nginx/traefik) for SSL termination
4. Consider using managed Qdrant Cloud instead of local container

## Troubleshooting

### Backend fails to start
Check if Qdrant is healthy first:
```bash
docker-compose ps
docker-compose logs qdrant
```

### Frontend can't connect to backend
Ensure `NEXT_PUBLIC_API_URL` is set correctly in `docker-compose.yml`.

### LLM API errors
Verify `DASHSCOPE_API_KEY` is set in `.env` file.
