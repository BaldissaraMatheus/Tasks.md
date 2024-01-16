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
ARG PUID=1000
ARG PGID=1000
ARG FILES_PATH=/tasks
ARG TITLE=""
ARG BASE_PATH=""
ENV VITE_TITLE $TITLE
ENV BASE_PATH $BASE_PATH
ENV FILES_PATH $FILES_PATH
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
	cp -r /config/stylesheets/. /stylesheets/ && \
	cp -r /stylesheets/. /config/stylesheets/ && \
	chown -R $PUID:$PGID /config && \
	chown -R $PUID:$PGID /tasks && \
	node /api/server.js
