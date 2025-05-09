FROM node:18.20.4-alpine3.20 AS build-stage

RUN apk add git
RUN set -eux \
    && mkdir -p /app \
    && mkdir -p /api

COPY frontend/ /app

WORKDIR /app
RUN rm -r src/components/Stacks-Editor
RUN git clone https://github.com/BaldissaraMatheus/Stacks-Editor src/components/Stacks-Editor
RUN set -eux \
    && npm ci --no-audit \
    && npm run build

COPY backend/ /api/

WORKDIR /api
RUN set -eux \
    && npm ci --no-audit

FROM alpine:3.20 AS final
ARG PUID=0
ARG PGID=0
ARG TITLE=""
ARG BASE_PATH="/"
ARG LOCAL_IMAGES_CLEANUP_INTERVAL=1440
ENV VITE_TITLE=$TITLE
ENV BASE_PATH=$BASE_PATH
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

COPY --from=build-stage --chown=$PUID:$PGID /app/dist/. /static/
COPY --from=build-stage --chown=$PUID:$PGID /app/dist/stylesheets/. /stylesheets/
COPY --from=build-stage --chown=$PUID:$PGID /api/ /api/
RUN rm -r /static/stylesheets

WORKDIR /api
EXPOSE 8080


ENTRYPOINT mkdir -p ${TASKS_DIR} && \
           mkdir -p ${CONFIG_DIR}/stylesheets/ && \
           mkdir -p ${CONFIG_DIR}/images/ && \
           mkdir -p ${CONFIG_DIR}/sort/ && \
           cp -r ${CONFIG_DIR}/stylesheets/. /stylesheets/ && \
           cp -r /stylesheets/. ${CONFIG_DIR}/stylesheets/ && \
           chown -R $PUID:$PGID ${CONFIG_DIR} && \
           chown -R $PUID:$PGID ${TASKS_DIR} && \
           node /api/server.js
