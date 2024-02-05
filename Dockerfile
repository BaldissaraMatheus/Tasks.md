FROM node:18-alpine3.17 as build-stage

RUN set -eux \
	&& mkdir -p /app \
	&& mkdir -p /api \
	&& mkdir -p /tasks

COPY frontend/ /app

WORKDIR /app
RUN set -eux \
	&& npm ci \
	&& npm run build

COPY backend/ /api/

WORKDIR /api
RUN set -eux \
	&& npm ci

FROM alpine:3.17.2 as final
ARG PUID=0
ARG PGID=0
ARG TITLE=""
ARG BASE_PATH="/"
ARG LOCAL_IMAGES_CLEANUP_INTERVAL=1440
ENV VITE_TITLE $TITLE
ENV BASE_PATH $BASE_PATH
ENV LOCAL_IMAGES_CLEANUP_INTERVAL=$LOCAL_IMAGES_CLEANUP_INTERVAL
ENV CONFIG_DIR="/config"
ENV TASKS_DIR="/tasks"
ENV PUID $PUID
ENV PGID $PGID
ENV PORT 8080
USER root

RUN set -eux \
	&& apk add --no-cache nodejs npm

RUN mkdir /stylesheets

COPY --from=build-stage --chown=$PUID:$PGID /app/dist/. /static/
COPY --from=build-stage --chown=$PUID:$PGID /app/dist/stylesheets/. /stylesheets/
COPY --from=build-stage --chown=$PUID:$PGID /api/ /api/
RUN rm -r /static/stylesheets

VOLUME /tasks
VOLUME /config
WORKDIR /api
EXPOSE 8080
ENTRYPOINT mkdir -p /config/stylesheets/ && \
	mkdir -p /config/images/ && \
	mkdir -p /config/sort/ && \
	cp -r /config/stylesheets/. /stylesheets/ && \
	cp -r /stylesheets/. /config/stylesheets/ && \
	chown -R $PUID:$PGID /config && \
	chown -R $PUID:$PGID /tasks && \
	node /api/server.js
