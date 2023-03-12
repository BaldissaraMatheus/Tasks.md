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

FROM nginx:alpine as final
ARG PUID=1000
ARG PGID=1000
ARG TITLE=""
ARG BASE_PATH=""
ENV VITE_TITLE $TITLE
ENV BASE_PATH $BASE_PATH
USER root

RUN set -eux \
	&& apk add --no-cache nodejs npm

RUN mkdir /stylesheets

COPY --from=build-stage --chown=$PUID:$PGID /app/dist/. /usr/share/nginx/html/
COPY --from=build-stage --chown=$PUID:$PGID /app/dist/stylesheets/. /stylesheets/
COPY --from=build-stage --chown=$PUID:$PGID /api/ /api/

COPY nginx.conf /etc/nginx/conf.d/
RUN [ $BASE_PATH != "" ] && \
	{ sed -i "s~BASE_PROXY~location BASE_PATH/ { proxy_pass http://localhost:8080/ }~g" /etc/nginx/conf.d/*.conf; } || \
	{ sed -i "s~BASE_PROXY~ ~g" /etc/nginx/conf.d/*.conf; }
RUN sed -i "s~BASE_PATH~${BASE_PATH}~g" /etc/nginx/conf.d/*.conf

VOLUME /api/files
VOLUME /usr/share/nginx/html/stylesheets/
WORKDIR /api
EXPOSE 8080
EXPOSE 3001
ENTRYPOINT [ -z "$(ls -A /usr/share/nginx/html/stylesheets)" ] && { \
	cp -R /stylesheets/. /usr/share/nginx/html/stylesheets/ & \
	chown -R $PUID:$PGID /usr/share/nginx/html & \
	chown -R $PUID:$PGID /api/files & \
	} || { echo ""; } \
	& nginx & node /api/server.js
