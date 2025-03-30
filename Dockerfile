FROM node:latest

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build TypeScript files
RUN npm run build

RUN npm run generate-data

EXPOSE 5000

# Default command
CMD ["npm", "start"]