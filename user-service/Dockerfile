FROM node:22-alpine

WORKDIR /app

COPY user-service/package*.json ./
COPY user-service/prisma ./prisma

RUN npm install --omit=dev
RUN npx prisma generate

COPY user-service/src ./src

EXPOSE 3001

CMD ["npm", "start"]