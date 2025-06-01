FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN npm install -g prisma

RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]