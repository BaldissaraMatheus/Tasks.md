# if [ ! -f "${CONFIG_DIR}/stylesheets/custom.css" ]; then
# 	echo "@import url(${BASE_PATH}/_api/stylesheet/color-themes/adwaita.css)" > "${CONFIG_DIR}/stylesheets/custom.css";
# fi
echo "@import url(${BASE_PATH}/_api/stylesheet/color-themes/adwaita.css)" > "${CONFIG_DIR}/stylesheets/custom.css";

awk '{gsub("href=\"./stylesheets/custom.css\"","href=\"'${BASE_PATH}'/_api/stylesheet/custom.css\"")}1' ../static/index.html > ./temp.html && mv ./temp.html ../static/index.html
# awk '{gsub("href=\"./stylesheets/custom.css\"","href=\"/stylesheet/custom.css\"")}1' ../static/index.html > ./temp.html && mv ./temp.html ../static/index.html

mkdir -p ${TASKS_DIR} && \
           mkdir -p ${CONFIG_DIR}/stylesheets/ && \
           mkdir -p ${CONFIG_DIR}/images/ && \
           mkdir -p ${CONFIG_DIR}/sort/ && \
           cp -r ${CONFIG_DIR}/stylesheets/. /stylesheets/ && \
           cp -r /stylesheets/. ${CONFIG_DIR}/stylesheets/ && \
           chown -R $PUID:$PGID ${CONFIG_DIR} && \
           chown -R $PUID:$PGID ${TASKS_DIR} && \
           node /api/server.js