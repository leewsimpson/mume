# GitHub OAuth Setup Guide

This guide explains how to set up GitHub OAuth for local development.

## Step 1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" in the left sidebar
3. Click "New OAuth App"
4. Fill in the following details:
   - **Application name**: Multi-User Markdown Editor (Local Dev)
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: http://localhost:3000/auth/github/callback
5. Click "Register application"

## Step 2: Get Your Client ID and Secret

1. After creating the app, you'll see your **Client ID** on the app page
2. Click "Generate a new client secret" to get your **Client Secret**
3. **IMPORTANT**: Copy the client secret immediately - you won't be able to see it again!

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and update the following variables:
   - `GITHUB_CLIENT_ID`: Paste your Client ID from Step 2
   - `GITHUB_CLIENT_SECRET`: Paste your Client Secret from Step 2
   - `SESSION_SECRET`: Generate a random secret with `openssl rand -hex 32`

3. The `TOKEN_ENCRYPTION_KEY` should already be set, but if not, generate one:
   ```bash
   openssl rand -hex 32
   ```

## Step 4: Start the Application

1. Ensure Docker is running (for PostgreSQL and Redis):
   ```bash
   docker-compose up -d
   ```

2. Start the backend:
   ```bash
   cd apps/api
   npm run dev
   ```

3. Start the frontend (in a separate terminal):
   ```bash
   cd apps/frontend
   npm run dev
   ```

4. Open http://localhost:5173 in your browser
5. Click "Sign in with GitHub" to test the OAuth flow

## Troubleshooting

- **"Redirect URI mismatch"**: Ensure the callback URL in your GitHub OAuth App settings matches exactly: `http://localhost:3000/auth/github/callback`
- **"Application suspended"**: Check that your GitHub account is in good standing
- **Session issues**: Ensure Redis is running (`docker ps` should show the redis container)

## Production Setup

For production deployment:
1. Create a separate GitHub OAuth App with production URLs
2. Update environment variables with production values
3. Use HTTPS for all URLs
4. Store secrets securely (e.g., AWS Secrets Manager, Azure Key Vault)
