# syntax=docker/dockerfile:1
# 정적 SPA만 서빙(nginx). 의제 API·로그인·실시간 동기화는 포함되지 않음 — DOCKER.md 참고.
ARG NODE_VERSION=lts-alpine

FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite는 빌드 시점에 VITE_* 만 인라인합니다. 필요 시 예:
# docker build --build-arg VITE_API_BASE=https://example.com -t kings-dilemma .
ARG VITE_API_BASE=
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
