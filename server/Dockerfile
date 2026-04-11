FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Remove devDependencies for smaller image
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/index.js"]
