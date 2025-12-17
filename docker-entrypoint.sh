#!/bin/sh
set -e

echo "Running Prisma setup..."
npx prisma generate
npx prisma migrate deploy

echo "Starting application..."
exec npm run start
