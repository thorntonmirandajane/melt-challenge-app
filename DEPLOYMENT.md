# Deployment Guide - Render

This guide will help you deploy the Melt Challenge App to Render.

## Prerequisites

1. A [Render account](https://render.com) (free tier available)
2. Your GitHub repository connected to Render
3. Your Shopify App credentials

## Step 1: Update Database Schema for Production

Before deploying, we need to update the Prisma schema to use PostgreSQL for production:

1. Open `prisma/schema.prisma`
2. Change line 12 from:
   ```prisma
   provider = "sqlite"
   ```
   to:
   ```prisma
   provider = "postgresql"
   ```

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Create a new Blueprint Instance on Render:**
   - Go to https://dashboard.render.com/blueprints
   - Click "New Blueprint Instance"
   - Connect your GitHub repository: `thorntonmirandajane/melt-challenge-app`
   - Render will automatically detect the `render.yaml` file
   - Click "Apply"

3. **Set Environment Variables:**
   After the blueprint is created, go to your web service settings and add these secret values:
   - `SHOPIFY_API_KEY` - Your Shopify API key
   - `SHOPIFY_API_SECRET` - Your Shopify API secret
   - `SHOPIFY_APP_URL` - Your Render app URL (e.g., `https://melt-challenge-app.onrender.com`)
   - `SHOPIFY_MULTIPASS_SECRET` - Your Multipass secret
   - `SESSION_SECRET` - A random secret (generate with: `openssl rand -hex 32`)
   - `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY` - Your Cloudinary API key
   - `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

### Option B: Manual Setup

1. **Create PostgreSQL Database:**
   - Go to https://dashboard.render.com/
   - Click "New +" → "PostgreSQL"
   - Name: `melt-challenge-db`
   - Plan: Free
   - Click "Create Database"
   - Copy the **Internal Database URL**

2. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** `melt-challenge-app`
     - **Region:** Oregon (or your preferred region)
     - **Branch:** `main`
     - **Runtime:** Node
     - **Build Command:** `npm install && npx prisma generate && npm run build`
     - **Start Command:** `npm run docker-start`
     - **Plan:** Free

3. **Add Environment Variables:**
   In the web service, go to "Environment" and add all the variables listed in Option A above, plus:
   - `DATABASE_URL` - Paste the Internal Database URL from your PostgreSQL database

## Step 3: Update Shopify App URL

1. After deployment, Render will give you a URL like `https://melt-challenge-app.onrender.com`
2. Update the `SHOPIFY_APP_URL` environment variable in Render with this URL
3. Update your Shopify Partner Dashboard:
   - Go to https://partners.shopify.com
   - Select your app
   - Go to "Configuration"
   - Update "App URL" to your Render URL
   - Update "Allowed redirection URL(s)" to include:
     - `https://your-app.onrender.com/auth`
     - `https://your-app.onrender.com/auth/callback`
   - Save changes

## Step 4: Run Database Migrations

The `docker-start` command in package.json will automatically run:
```bash
npm run setup && npm run start
```

This runs:
- `prisma generate` - Generates Prisma Client
- `prisma migrate deploy` - Runs all pending migrations

The database will be set up automatically on first deployment.

## Step 5: Test Your Deployment

1. Visit your Render URL
2. Install the app on a test store
3. Test the customization feature:
   - Go to Admin → Customize
   - Update colors and text
   - Visit the customer challenge forms to see your changes

## Important Notes

- **Free Tier Limitations:**
  - Render free tier spins down after 15 minutes of inactivity
  - First request after spin-down will be slow (30-60 seconds)
  - Database is limited to 1GB
  - Consider upgrading for production use

- **Database Migrations:**
  - Never run `prisma migrate dev` in production
  - Use `prisma migrate deploy` for production migrations
  - The setup script handles this automatically

- **Environment Variables:**
  - Never commit `.env` file to GitHub
  - All secrets should be set in Render dashboard
  - Update `SHOPIFY_APP_URL` after first deployment

## Updating Your App

To deploy updates:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically rebuild and redeploy your app.

## Troubleshooting

### Database Connection Issues
- Check that `DATABASE_URL` is correctly set
- Verify the database is running in Render dashboard
- Check Render logs for connection errors

### App Not Loading
- Check Render logs for errors
- Verify all environment variables are set
- Ensure Shopify App URL matches your Render URL

### Migrations Failing
- Check that `provider = "postgresql"` in schema.prisma
- Verify DATABASE_URL points to PostgreSQL database
- Check Render logs for specific migration errors

## Need Help?

- [Render Documentation](https://render.com/docs)
- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [Prisma Deployment Docs](https://www.prisma.io/docs/guides/deployment)
