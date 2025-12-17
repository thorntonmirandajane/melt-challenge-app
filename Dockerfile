FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci
RUN npm cache clean --force

COPY . .

RUN npx prisma generate

RUN npm run build

# Create a startup script that runs migrations then starts the app
RUN echo '#!/bin/sh\nset -e\necho "Running Prisma migrations..."\nnpx prisma migrate deploy\necho "Starting application..."\nexec npm run start' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
