# Stage 1: build Angular
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build -- --configuration production

# Stage 2: serve con nginx
FROM nginx:1.27-alpine

# Configurazione nginx (CSP, HTTPS redirect, gzip, ecc.)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Bundle Angular
COPY --from=builder /app/dist/sh-config-service-central-ui/browser /usr/share/nginx/html

# Utente non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
