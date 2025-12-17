FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci
RUN npm cache clean --force

COPY . .

# Make migration script executable
COPY migrate.sh /app/migrate.sh
RUN chmod +x /app/migrate.sh

RUN npx prisma generate

RUN npm run build

CMD ["npm", "run", "start"]
