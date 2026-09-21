FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose backend application port
EXPOSE 5000

# Environment variables default
ENV NODE_ENV=production
ENV PORT=5000

# Start Express server
CMD ["node", "index.js"]
