FROM node:20

WORKDIR /app

# Install openssl for cert generation
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Add the script
COPY scripts/generate-certs.sh /generate-certs.sh
RUN chmod +x /generate-certs.sh

# Now copy the frontend code
COPY frontend/package.json ./
RUN npm cache clean --force
RUN npm install -g pnpm && pnpm install

COPY frontend ./

# Run next.js without turbopack to avoid optional rust dependencies issues on build
ENV TURBOPACK=0

# Start the application using a custom server server.js
CMD ["/bin/sh", "-c", "/generate-certs.sh frontend && npm run build && node server.js"]