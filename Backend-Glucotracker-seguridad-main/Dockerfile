# =========================
# BASE IMAGE
# =========================
FROM node:18.17-alpine

WORKDIR /app

# Dependencias primero (cache optimizado)
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Si usas TS, luego agregamos build step
# RUN npm run build

EXPOSE 3000

# Variables de entorno (se pasan desde docker-compose)
ENV NODE_ENV=production

CMD ["node", "server.js"]