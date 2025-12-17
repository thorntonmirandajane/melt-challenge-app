FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci
RUN npm cache clean --force

COPY . .

# Copy and set permissions for entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN npx prisma generate

RUN npm run build

CMD ["/app/docker-entrypoint.sh"]
