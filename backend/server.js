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

async function getLanesNames() {
  await fs.promises.mkdir(process.env.TASKS_DIR, { recursive: true });
  return fs.promises.readdir(process.env.TASKS_DIR);
}

async function getMdFiles() {
  const lanes = await getLanesNames();
  const lanesFiles = await Promise.all(
    lanes.map((lane) =>
      fs.promises
        .readdir(`${process.env.TASKS_DIR}/${lane}`)
        .then((files) => files.map((file) => ({ lane, name: file })))
    )
  );
  const files = lanesFiles
    .flat()
    .filter(file => file.name.endsWith('.md'));
  return files;
}

function getContent(path) {
  return fs.promises.readFile(path).then((res) => res.toString());
}

async function getTags(ctx) {
  const files = await getMdFiles();
  const filesContents = await Promise.all(
    files.map((file) =>
      getContent(`${process.env.TASKS_DIR}/${file.lane}/${file.name}`)
    )
  );
  const usedTagsTexts = filesContents
    .map((content) => getTagsTextsFromCardContent(content))
    .flat()
    .sort((a, b) => a.localeCompare(b));
  const usedTagsTextsWithoutDuplicates = Array.from(
    new Set(usedTagsTexts.map((tagText) => tagText.toLowerCase()))
  );
  const allTags = await fs.promises
    .readFile(`${process.env.CONFIG_DIR}/tags.json`)
    .then((res) => JSON.parse(res.toString()))
    .catch((err) => []);
  const usedTags = usedTagsTextsWithoutDuplicates.map(
    (tag) =>
      allTags.find((tagToFind) => tagToFind.name.toLowerCase() === tag) || {
        name: tag,
        backgroundColor: "var(--tag-color-1)",
      }
  );
  await fs.promises.writeFile(
    `${process.env.CONFIG_DIR}/tags.json`,
    JSON.stringify(usedTags)
  );
  ctx.status = 200;
  ctx.body = usedTags;
}

router.get("/tags", getTags);

async function updateTagBackgroundColor(ctx) {
  const name = ctx.params.tagName;
  const backgroundColor = ctx.request.body.backgroundColor;
  const tags = await fs.promises
    .readFile(`${process.env.CONFIG_DIR}/tags.json`)
    .then((res) => JSON.parse(res.toString()))
    .catch((err) => []);
  const tagIndex = tags.findIndex(
    (tag) => tag.name.toLowerCase() === name.toLowerCase()
  );
  if (tagIndex === -1) {
    ctx.status = 404;
    ctx.body = `Tag ${name} not found`;
    return;
  }
  tags[tagIndex].backgroundColor = backgroundColor;
  await fs.promises.writeFile(
    `${process.env.CONFIG_DIR}/tags.json`,
    JSON.stringify(tags)
  );
  ctx.status = 204;
}

router.patch("/tags/:tagName", updateTagBackgroundColor);

function getTagsTextsFromCardContent(cardContent) {
  const indexOfTagsKeyword = cardContent.toLowerCase().indexOf("tags: ");
  if (indexOfTagsKeyword === -1) {
    return [];
  }
  let startOfTags = cardContent.substring(indexOfTagsKeyword + "tags: ".length);
  const lineBreak = cardContent.indexOf("\n");
  if (lineBreak > 0) {
    startOfTags = startOfTags.split("\n")[0];
  }
  const tags = startOfTags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");

  return tags;
}

async function getLaneByCardName(cardName) {
  const files = await getMdFiles();
  return files.find((file) => file.name === `${cardName}.md`).lane;
}

async function getLanes(ctx) {
  const lanes = await fs.promises.readdir(process.env.TASKS_DIR);
  ctx.body = lanes;
}

router.get("/lanes", getLanes);

async function getCards(ctx) {
  const files = await getMdFiles();
  const filesContents = await Promise.all(
    files.map(async (file) => {
      const content = await getContent(
        `${process.env.TASKS_DIR}/${file.lane}/${file.name}`
      );
      const newName = file.name.substring(0, file.name.length - 3);
      return { ...file, content, name: newName };
    })
  );
  ctx.body = filesContents;
}

router.get("/cards", getCards);

async function createCard(ctx) {
  const lane = ctx.request.body.lane;
  const name = uuid.v4();
  await fs.promises.writeFile(
    `${process.env.TASKS_DIR}/${lane}/${name}.md`,
    ""
  );
  await fs.promises.chown(
    `${process.env.TASKS_DIR}/${lane}/${name}.md`,
    PUID,
    PGID
  );
  ctx.body = name;
  ctx.status = 201;
}

router.post("/cards", createCard);

async function updateCard(ctx) {
  const oldLane = await getLaneByCardName(ctx.params.card);
  const name = ctx.params.card;
  const newLane = ctx.request.body.lane || oldLane;
  const newName = ctx.request.body.name || name;
  const newContent = ctx.request.body.content;
  if (newLane !== oldLane || name !== newName) {
    await fs.promises.rename(
      `${process.env.TASKS_DIR}/${oldLane}/${name}.md`,
      `${process.env.TASKS_DIR}/${newLane}/${newName}.md`
    );
  }
  if (newContent) {
    await fs.promises.writeFile(
      `${process.env.TASKS_DIR}/${newLane}/${newName}.md`,
      newContent
    );
  }
  await fs.promises.chown(
    `${process.env.TASKS_DIR}/${newLane}/${newName}.md`,
    PUID,
    PGID
  );
  ctx.status = 204;
}

router.patch("/cards/:card", updateCard);

async function deleteCard(ctx) {
  const lane = await getLaneByCardName(ctx.params.card);
  const name = ctx.params.card;
  await fs.promises.rm(`${process.env.TASKS_DIR}/${lane}/${name}.md`);
  ctx.status = 204;
}

router.delete("/cards/:card", deleteCard);

async function createCard(ctx) {
  const lane = ctx.request.body.lane;
  const name = uuid.v4();
  await fs.promises.writeFile(
    `${process.env.TASKS_DIR}/${lane}/${name}.md`,
    ""
  );
  await fs.promises.chown(
    `${process.env.TASKS_DIR}/${lane}/${name}.md`,
    PUID,
    PGID
  );
  ctx.body = name;
  ctx.status = 201;
}

async function createLane(ctx) {
  const lane = uuid.v4();
  await fs.promises.mkdir(`${process.env.TASKS_DIR}/${lane}`);
  await fs.promises.chown(`${process.env.TASKS_DIR}/${lane}`, PUID, PGID);
  ctx.body = lane;
  ctx.status = 201;
}

router.post("/lanes", createLane);

async function updateLane(ctx) {
  const name = ctx.params.lane;
  const newName = ctx.request.body.name;
  await fs.promises.rename(
    `${process.env.TASKS_DIR}/${name}`,
    `${process.env.TASKS_DIR}/${newName}`
  );
  await fs.promises.chown(`${process.env.TASKS_DIR}/${newName}`, PUID, PGID);
  ctx.status = 204;
}

router.patch("/lanes/:lane", updateLane);

async function deleteLane(ctx) {
  const lane = ctx.params.lane;
  await fs.promises.rm(`${process.env.TASKS_DIR}/${lane}`, {
    force: true,
    recursive: true,
  });
  ctx.status = 204;
}

router.delete("/lanes/:lane", deleteLane);

async function getTitle(ctx) {
  ctx.body = process.env.TITLE;
}

router.get("/title", getTitle);

async function getLanesSort(ctx) {
  const lanes = await fs.promises
    .readFile(`${process.env.CONFIG_DIR}/sort/lanes.json`)
    .then((res) => JSON.parse(res.toString()))
    .catch((err) => []);
  ctx.status = 200;
  ctx.body = lanes;
}

router.get("/sort/lanes", getLanesSort);

async function saveLanesSort(ctx) {
  const newSort = JSON.stringify(ctx.request.body || []);
  await fs.promises.mkdir(`${process.env.CONFIG_DIR}/sort`, {
    recursive: true,
  });
  await fs.promises.writeFile(
    `${process.env.CONFIG_DIR}/sort/lanes.json`,
    newSort
  );
  await fs.promises.chown(
    `${process.env.CONFIG_DIR}/sort/lanes.json`,
    PUID,
    PGID
  );
  ctx.status = 200;
}

router.post("/sort/lanes", saveLanesSort);

async function getCardsSort(ctx) {
  const cards = await fs.promises
    .readFile(`${process.env.CONFIG_DIR}/sort/cards.json`)
    .then((res) => JSON.parse(res.toString()))
    .catch((err) => []);
  ctx.status = 200;
  ctx.body = cards;
}

router.get("/sort/cards", getCardsSort);

async function saveCardsSort(ctx) {
  const newSort = JSON.stringify(ctx.request.body || []);
  await fs.promises.mkdir(`${process.env.CONFIG_DIR}/sort`, {
    recursive: true,
  });
  await fs.promises.writeFile(
    `${process.env.CONFIG_DIR}/sort/cards.json`,
    newSort
  );
  await fs.promises.chown(
    `${process.env.CONFIG_DIR}/sort/cards.json`,
    PUID,
    PGID
  );
  ctx.status = 200;
}

router.post("/sort/cards", saveCardsSort);

async function saveImage(ctx) {
  const imageName = ctx.request.file.originalname;
  await fs.promises.mkdir(`${process.env.CONFIG_DIR}/images`, {
    recursive: true,
  });
  await fs.promises.writeFile(
    `${process.env.CONFIG_DIR}/images/${imageName}`,
    ctx.request.file.buffer
  );
  await fs.promises.chown(
    `${process.env.CONFIG_DIR}/images/${imageName}`,
    PUID,
    PGID
  );
  ctx.status = 204;
}

router.post("/images", multerInstance.single("file"), saveImage);

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
app.use(mount(`${BASE_PATH}api`, router.routes()));
app.use(mount(BASE_PATH, serve("/static")));
app.use(mount(`${BASE_PATH}api/images`, serve(`${process.env.CONFIG_DIR}/images`)));
app.use(
  mount(
    `${BASE_PATH}stylesheets/`,
    serve(`${process.env.CONFIG_DIR}/stylesheets`)
  )
);

async function removeUnusedImages() {
  const files = await getMdFiles();
  const filesContents = await Promise.all(
    files.map(async (file) =>
      getContent(`${process.env.TASKS_DIR}/${file.lane}/${file.name}`)
    )
  );
  const imagesBeingUsed = filesContents
    .map((content) => content.match(/!\[[^\]]*\]\(([^\s]+[.]*)\)/g))
    .flat()
    .filter((image) => !!image && image.includes("/api/images/"))
    .map((image) => image.split("/api/images/")[1].slice(0, -1));
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