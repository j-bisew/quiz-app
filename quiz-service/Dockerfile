FROM node:22-alpine

WORKDIR /app

COPY quiz-service/package*.json ./
COPY quiz-service/prisma ./prisma

RUN npm install --omit=dev
RUN npx prisma generate

COPY quiz-service/src ./src

EXPOSE 3002

CMD ["npm", "start"]