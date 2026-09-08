# Фронт мини-аппа: собираем статику Vite и отдаём её nginx'ом.
# Образ публикуется в GHCR воркфлоу deploy.yml, сервер только тянет готовый —
# сборка node на сервере съела бы и диск, и время.

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Тесты и типы уже проверены отдельным job'ом; здесь только сборка.
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
