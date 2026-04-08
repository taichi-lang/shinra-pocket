FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm install typescript

COPY . .
RUN npx tsc || true

EXPOSE 3001

CMD ["node", "dist/index.js"]
