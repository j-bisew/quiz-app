FROM node:22-alpine

WORKDIR /app

COPY analytics-service/package*.json ./
COPY analytics-service/prisma ./prisma

RUN npm install --omit=dev
RUN npx prisma generate

COPY analytics-service/src ./src

EXPOSE 3003

CMD ["npm", "start"]