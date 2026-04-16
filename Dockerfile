FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run web:build

EXPOSE 3000

CMD ["npx", "serve", "dist", "--single", "--listen", "3000"]
