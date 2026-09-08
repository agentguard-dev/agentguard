# AgentGuard Pro-Server — Container-Image
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY server ./server
COPY cli.js ./
# Konfiguration via Umgebungsvariablen (siehe deploy/README.md)
EXPOSE 4000
CMD ["node", "server/app.js"]
