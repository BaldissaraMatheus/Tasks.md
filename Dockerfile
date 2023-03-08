FROM node:alpine3.11 as frontend
RUN mkdir -p /app
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
ARG TITLE=""
ENV VITE_TITLE $TITLE
RUN npm run build

FROM hoosin/alpine-nginx-nodejs:latest
RUN mkdir -p /api
RUN mkdir -p /api/files
RUN mkdir -p /stylesheets
COPY backend/ ./api/
WORKDIR /api
RUN npm ci
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY --from=frontend /app/dist/stylesheets /stylesheets
COPY nginx.conf /etc/nginx/conf.d/*.conf
ARG BASE_PATH=""
ENV BASE_PATH $BASE_PATH
RUN [ $BASE_PATH != "" ] && { sed -i "s~BASE_PROXY~location BASE_PATH/ { proxy_pass http://localhost:80/ }~g" /etc/nginx/conf.d/*.conf; } || { sed -i "s~BASE_PROXY~ ~g" /etc/nginx/conf.d/*.conf; }
RUN sed -i "s~BASE_PATH~${BASE_PATH}~g" /etc/nginx/conf.d/*.conf
EXPOSE 80
VOLUME /api/files 
VOLUME /usr/share/nginx/html/stylesheets/
ENTRYPOINT cp -R /usr/share/nginx/html/stylesheets/. /stylesheets/ & cp -R /stylesheets/. /usr/share/nginx/html/stylesheets/ & nginx & node server.js