FROM node:18-alpine3.17 as build-stage

RUN set -eux \
	&& mkdir -p /app \
	&& mkdir -p /api \
	&& mkdir -p /api/files

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
ARG TITLE=""
ARG BASE_PATH=""
ARG ENABLE_LOCAL_IMAGES=false
ENV VITE_TITLE $TITLE
ENV BASE_PATH $BASE_PATH
ENV ENABLE_LOCAL_IMAGES $ENABLE_LOCAL_IMAGES
USER root

RUN set -eux \
	&& apk add --no-cache nodejs npm

RUN mkdir /stylesheets

COPY --from=build-stage --chown=$PUID:$PGID /app/dist/. /api/static/
COPY --from=build-stage --chown=$PUID:$PGID /app/dist/stylesheets/. /stylesheets/
COPY --from=build-stage --chown=$PUID:$PGID /api/ /api/

VOLUME /api/files
VOLUME /api/static/stylesheets
WORKDIR /api
EXPOSE 8080
ENTRYPOINT [ -z "$(ls -A /api/static/stylesheets)" ] && { \
	cp -R /stylesheets/. /api/static/stylesheets/ & \
	chown -R $PUID:$PGID /api/static & \
	chown -R $PUID:$PGID /api/files & \
	} || { echo ""; } \
	& node /api/server.js
