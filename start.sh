#!/bin/sh
set -e

echo "Running Prisma database setup..."
npx prisma db push --accept-data-loss

echo "Starting application..."
exec npm run start
