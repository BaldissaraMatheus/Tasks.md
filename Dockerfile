FROM node:18.20.4-alpine3.20 AS build-stage

RUN apk add git
RUN set -eux \
    && mkdir -p /app \
    && mkdir -p /api

COPY frontend/ /app
COPY entrypoint.sh /api/entrypoint.sh

WORKDIR /app
ARG BASE_PATH="/"
RUN rm -r src/components/Stacks-Editor
RUN git clone https://github.com/BaldissaraMatheus/Stacks-Editor src/components/Stacks-Editor
RUN set -eux \
    && npm ci --no-audit \
    && npm run build
RUN rm ./dist/stylesheets/custom.css

COPY backend/ /api/

WORKDIR /api
RUN set -eux \
    && npm ci --no-audit

FROM alpine:3.20 AS final
ARG PUID=0
ARG PGID=0
ARG TITLE=""
ARG BASE_PATH="/"
ENV BASE_PATH=$BASE_PATH
ARG LOCAL_IMAGES_CLEANUP_INTERVAL=1440
ENV LOCAL_IMAGES_CLEANUP_INTERVAL=$LOCAL_IMAGES_CLEANUP_INTERVAL
ENV CONFIG_DIR="/config"
ENV TASKS_DIR="/tasks"
ENV PUID=$PUID
ENV PGID=$PGID
ENV PORT=8080
USER root

RUN set -eux \
    && apk add --no-cache nodejs npm

RUN mkdir /stylesheets

COPY --from=build-stage --chown=$PUID:$PGID /app/dist/. static
COPY --from=build-stage --chown=$PUID:$PGID /app/dist/stylesheets/. /stylesheets/
COPY --from=build-stage --chown=$PUID:$PGID /api/ /api/
RUN rm -r static/stylesheets

VOLUME /tasks
VOLUME /config
WORKDIR /api
EXPOSE 8080

ENTRYPOINT sh entrypoint.sh
