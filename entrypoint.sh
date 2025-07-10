TASKS_DIR=/tasks;
CONFIG_DIR=/config;
mkdir -p ${TASKS_DIR};
mkdir -p ${CONFIG_DIR}/stylesheets/;
mkdir -p ${CONFIG_DIR}/images/;
mkdir -p ${CONFIG_DIR}/sort/;
echo $BASE_PATH
if [ ! -f "${CONFIG_DIR}/stylesheets/custom.css" ]; then
  echo "@import url(${BASE_PATH}/stylesheets/color-themes/adwaita.css)" > "${CONFIG_DIR}/stylesheets/custom.css";
fi

cd /app;
if [ -n "$BASE_PATH" ]; then
  npm run build -- --base=${BASE_PATH}/;
else
  npm run build -- --base="/";
fi
rm dist/stylesheets/custom.css;
rm -rf /api/static;
mv dist /api/static --no-target-directory;

# update css imports to have correct base_path
awk '{gsub("@import url\\((.*)/stylesheets/color-themes/","@import url('${BASE_PATH}'/stylesheets/color-themes/")}1' "${CONFIG_DIR}/stylesheets/custom.css" > ./temp.css && mv ./temp.css "${CONFIG_DIR}/stylesheets/custom.css";

cd /api;
cp -r ${CONFIG_DIR}/stylesheets/. ./static/stylesheets/;
cp -r ./static/stylesheets/. ${CONFIG_DIR}/stylesheets/;

# TODO replace with --user flag
chown -R $PUID:$PGID ${CONFIG_DIR};
chown -R $PUID:$PGID ${TASKS_DIR};

CONFIG_DIR=$CONFIG_DIR TASKS_DIR=$TASKS_DIR PORT=8080 node /api/server.js;