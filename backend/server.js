const fs = require("fs");
const uuid = require("uuid");
const Koa = require("koa");
const app = new Koa();
const router = require("@koa/router")();
const bodyParser = require("koa-bodyparser");
const cors = require("@koa/cors");
const multer = require("@koa/multer");
const mount = require("koa-mount");
const serve = require("koa-static");

const PUID = Number(process.env.PUID);
const PGID = Number(process.env.PGID);
const BASE_PATH =
  process.env.BASE_PATH.at(-1) === "/"
    ? process.env.BASE_PATH
    : `${process.env.BASE_PATH}/`;

const multerInstance = multer();

async function getTags(ctx) {
  const subPath = decodeURI(ctx.request.url.substring("/tags".length));
  const tags = await fs.promises
    .readFile(`${process.env.CONFIG_DIR}/tags.json`)
    .then((res) => JSON.parse(res.toString()))
    .catch((err) => ({}));
  const pathTags = JSON.stringify(tags[subPath]);
  ctx.body = pathTags || {};
  ctx.status = 200;
}

router.get("/tags/:path*", getTags);

async function updateTagBackgroundColor(ctx) {
  const subPath = decodeURI(ctx.request.url.substring("/tags".length));
  const tags = await fs.promises
    .readFile(`${process.env.CONFIG_DIR}/tags.json`)
    .then((res) => JSON.parse(res.toString() || "{}"))
    .catch((err) => ({}));
  const tagsColors = ctx.request.body;
  const newTags = { ...tags, [subPath]: tagsColors };
  await fs.promises.writeFile(
    `${process.env.CONFIG_DIR}/tags.json`,
    JSON.stringify(newTags)
  );
  ctx.status = 204;
}

router.patch("/tags/:path*", updateTagBackgroundColor);

async function getTitle(ctx) {
  ctx.body = process.env.TITLE;
}

router.get("/title", getTitle);

async function getResource(ctx) {
  const path = ctx.request.url.substring("/resources".length);
  const resources = await fs.promises.readdir(
    `${process.env.TASKS_DIR}/${decodeURI(path)}`,
    { withFileTypes: true }
  ).catch(err => {
    console.log(err.code)
    if (err.code === 'ENOENT') {
      fs.promises.mkdir(`${process.env.TASKS_DIR}/${decodeURI(path)}`)
      return [];
    }
    throw err;
  })
  const lanes = resources
    .filter((dir) => dir.isDirectory() && !dir.name.startsWith("."))
    .map((dir) => dir.name);

  const lanesWithFiles = await Promise.all(
    lanes.map(async (lane) => {
      const filesPromises = await fs.promises
        .readdir(`${process.env.TASKS_DIR}/${decodeURI(`${path}`)}/${lane}`)
        .then((files) =>
          files
            .filter(
              (fileName) =>
                fileName.endsWith(".md") && !fileName.startsWith(".")
            )
            .map(async (fileName) => {
              const getFileContent = fs.promises.readFile(
                `${process.env.TASKS_DIR}/${decodeURI(
                  `${path}`
                )}/${lane}/${fileName}`
              );
              const getFileStats = fs.promises.stat(
                `${process.env.TASKS_DIR}/${decodeURI(
                  `${path}`
                )}/${lane}/${fileName}`
              );
              const [content, stats] = await Promise.all([
                getFileContent,
                getFileStats,
              ]);
              return {
                name: fileName.substring(0, fileName.length - 3),
                content: content.toString(),
                lastUpdated: stats.mtime,
                createdAt: stats.birthtime,
              };
            })
        );
      const files = await Promise.all(filesPromises);
      return {
        name: lane,
        files,
      };
    })
  );
  ctx.body = lanesWithFiles;
}

router.get("/resource/:path*", getResource);

async function createResource(ctx) {
  const subPath = decodeURI(ctx.request.url.substring("/resources".length));
  const isFile = ctx.request.body?.isFile;
  const content = ctx.request.body?.content || "";
  if (isFile) {
    await fs.promises.writeFile(`${process.env.TASKS_DIR}/${subPath}`, content);
  } else {
    await fs.promises.mkdir(`${process.env.TASKS_DIR}/${subPath}`);
  }
  await fs.promises.chown(`${process.env.TASKS_DIR}/${subPath}`, PUID, PGID);
  ctx.status = 201;
}

router.post("/resource/:path*", createResource);

async function updateResource(ctx) {
  const oldPath = decodeURI(ctx.request.url.substring("/resources".length));
  const newPath = decodeURI(ctx.request.body.newPath || oldPath).replaceAll(
    /<>:"\/\\\|\?\*/g,
    " "
  );
  if (newPath !== oldPath) {
    await fs.promises.rename(
      `${process.env.TASKS_DIR}/${oldPath}`,
      `${process.env.TASKS_DIR}/${newPath}`
    );
  }

  const newContent = ctx.request.body.content;

  const isFile = fs.lstatSync(`${process.env.TASKS_DIR}/${newPath}`).isFile();
  if (isFile && newContent !== undefined) {
    await fs.promises.writeFile(
      `${process.env.TASKS_DIR}/${newPath}`,
      newContent
    );
  }
  await fs.promises.chown(`${process.env.TASKS_DIR}/${newPath}`, PUID, PGID);
  ctx.status = 204;
}

router.patch("/resource/:path*", updateResource);

async function deleteResource(ctx) {
  const subPath = decodeURI(ctx.request.url.substring("/resources".length));
  await fs.promises.rm(`${process.env.TASKS_DIR}/${subPath}`, {
    force: true,
    recursive: true,
  });
  ctx.status = 204;
}

router.delete("/resource/:path*", deleteResource);

async function uploadImage(ctx) {
  await fs.promises.mkdir(`${process.env.CONFIG_DIR}/images`, {
    recursive: true,
  });
  const originalname = ctx.request.file.originalname;
  const extension = originalname.split(".").at(-1);
  const imageName = `${uuid.v4()}.${extension}`;
  await fs.promises.writeFile(
    `${process.env.CONFIG_DIR}/images/${imageName}`,
    ctx.request.file.buffer
  );
  await fs.promises.chown(
    `${process.env.CONFIG_DIR}/images/${imageName}`,
    PUID,
    PGID
  );
  ctx.status = 200;
  ctx.body = imageName;
}

router.post("/image", multerInstance.single("file"), uploadImage);

async function updateSort(ctx) {
  const subPath = decodeURI(ctx.request.url.substring("/sort".length));
  const newSort = { [subPath]: ctx.request.body || {} };
  const currentSort = await fs.promises
    .readFile(`${process.env.CONFIG_DIR}/sort.json`)
    .then((res) => JSON.parse(res.toString()))
    .catch((err) => []);
  const mergedSort = JSON.stringify({ ...(currentSort || {}), ...newSort });
  await fs.promises.writeFile(
    `${process.env.CONFIG_DIR}/sort.json`,
    mergedSort
  );
  await fs.promises.chown(`${process.env.CONFIG_DIR}/sort.json`, PUID, PGID);
  ctx.status = 200;
}

router.put("/sort/:path*", updateSort);

async function getSort(ctx) {
  const subPath = decodeURI(ctx.request.url.substring("/sort".length));
  const sort = await fs.promises
    .readFile(`${process.env.CONFIG_DIR}/sort.json`)
    .then((res) => JSON.parse(res.toString()))
    .catch((err) => []);
  const pathSort = JSON.stringify(sort[subPath]);
  ctx.body = pathSort || {};
  ctx.status = 200;
}

router.get("/sort/:path*", getSort);

app.use(cors());
app.use(bodyParser());
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(err);
    err.status = err.statusCode || err.status || 500;
    throw err;
  }
});

app.use(async (ctx, next) => {
  if (BASE_PATH === "/") {
    return next();
  }
  if (
    ctx.URL.href ===
    `${ctx.URL.origin}${BASE_PATH.substring(0, BASE_PATH.length - 1)}`
  ) {
    ctx.status = 301;
    return ctx.redirect(`${ctx.URL.origin}${BASE_PATH}`);
  }
  await next();
});
app.use(mount(`${BASE_PATH}_api`, router.routes()));
app.use(mount(BASE_PATH, serve(`/static`)));
app.use(
  mount(`${BASE_PATH}_api/image`, serve(`${process.env.CONFIG_DIR}/images`))
);

app.use(
  mount(
    `${BASE_PATH}_api/stylesheet`,
    serve(`${process.env.CONFIG_DIR}/stylesheets`)
  )
);

async function getfilesPaths(dirPath) {
  const dirsAndFiles = (await fs.promises.readdir(dirPath,
    { withFileTypes: true }
  ));
  const files = dirsAndFiles
    .filter(dirOrFile => dirOrFile.isFile() 
      && dirOrFile.name.endsWith(".md") 
      && !dirOrFile.name.startsWith(".")
  ).map(file => `${dirPath}/${file.name}`)
  const subFilesPromises = dirsAndFiles
    .filter(dirOrFile => dirOrFile.isDirectory())
    .map(dir => getfilesPaths(`${dirPath}/${dir.name}`))
  const subFiles = await Promise.all(subFilesPromises).then(res => res.flat())
  return [...files, ...subFiles];
}

async function removeUnusedImages() {
  await fs.promises.mkdir(process.env.TASKS_DIR, { recursive: true });
  const tasksDir = process.env.TASKS_DIR;
  const allFiles = await getfilesPaths(tasksDir)
  const filesReadPromises = allFiles.map(file => fs.promises.readFile(file))
  const filesContents = await Promise.all(filesReadPromises).then(buffers => buffers.map(buffer => buffer.toString()));
  const imagesBeingUsed = filesContents
    .map((content) => content.match(/!\[[^\]]*\]\(([^\s]+[.]*)\)/g))
    .flat()
    .filter((image) => !!image && image.includes("_api/image/"))
    .map((image) => image.split("_api/image/")[1].slice(0, -1));
  const allImages = await fs.promises.readdir(
    `${process.env.CONFIG_DIR}/images`
  );
  const unusedImages = allImages.filter(
    (image) => !imagesBeingUsed.includes(image)
  );
  await Promise.all(
    unusedImages.map((image) =>
      fs.promises.rm(`${process.env.CONFIG_DIR}/images/${image}`)
    )
  );
}

if (process.env.LOCAL_IMAGES_CLEANUP_INTERVAL) {
  const intervalInMs = process.env.LOCAL_IMAGES_CLEANUP_INTERVAL * 60000;
  try {
    if (intervalInMs > 0) {
      setInterval(removeUnusedImages, intervalInMs);
    }
  } catch (error) {
    console.error(error);
  }
}

app.listen(process.env.PORT);
