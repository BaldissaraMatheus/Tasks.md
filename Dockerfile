FROM nginx:alpine
ARG PUID=1000
ARG PGID=1000
ARG TITLE=""
ARG BASE_PATH=""
ENV VITE_TITLE $TITLE
ENV BASE_PATH $BASE_PATH
USER root
RUN mkdir -p /app
RUN mkdir -p /stylesheets
RUN mkdir -p /api
RUN mkdir -p /api/files
RUN apk add --update nodejs npm
COPY frontend/ /app/
RUN cd /app ; npm ci ; npm run build
RUN cp -R /app/dist/. /usr/share/nginx/html/
COPY backend/ /api/
RUN cd /api ; npm ci
COPY nginx.conf /etc/nginx/conf.d/
RUN [ $BASE_PATH != "" ] && { sed -i "s~BASE_PROXY~location BASE_PATH/ { proxy_pass http://localhost:8080/ }~g" /etc/nginx/conf.d/*.conf; } || { sed -i "s~BASE_PROXY~ ~g" /etc/nginx/conf.d/*.conf; }
RUN sed -i "s~BASE_PATH~${BASE_PATH}~g" /etc/nginx/conf.d/*.conf
RUN chown -R $PUID:$PGID /app/dist/stylesheets
RUN chown -R $PUID:$PGID /app/dist/stylesheets/color-themes
RUN chown -R $PUID:$PGID /api/files
VOLUME /api/files 
VOLUME /usr/share/nginx/html/stylesheets/
WORKDIR /api
EXPOSE 8080
EXPOSE 3001
ENTRYPOINT [ -z "$(ls -A /usr/share/nginx/html/stylesheets)" ] && { \
	cp -R /app/dist/stylesheets/. /usr/share/nginx/html/stylesheets/ & \
	chown -R $PUID:$PGID /usr/share/nginx/html & \
	chown -R $PUID:$PGID /api/files & \
	} || { echo ""; } \
	& nginx & node /api/server.js
