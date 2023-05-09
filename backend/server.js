const path = require('path')
const fs = require('fs');
const uuid = require('uuid');
const Koa = require('koa');
const app = new Koa();
const router = require('@koa/router')();
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const multer = require('@koa/multer');
const send = require('koa-send')
const mount = require('koa-mount');
const serve = require('koa-static');
const PUID = Number(process.env.PUID || '1000');
const PGID = Number(process.env.PGID || '1000');
const ENABLE_LOCAL_IMAGES = process.env.ENABLE_LOCAL_IMAGES === 'true';
const BASE_PATH = process.env.BASE_PATH ? `${process.env.BASE_PATH}/` : '/';

const multerInstance = multer();

function getContent(path) {
	return fs.promises.readFile(path).then(res => res.toString());
}

async function getLanesNames() {
	await fs.promises.mkdir('files', { recursive: true });
	return fs.promises.readdir('files');
}

async function getLaneByCardName(cardName) {
	const lanes = await getLanesNames();
	const lanesFiles = await Promise.all(lanes.map(lane => fs.promises.readdir(`files/${lane}`)
		.then(files => files.map(file => ({ lane, name: file }))))
	);
	const files = lanesFiles.flat();
	return files.find(file => file.name === `${cardName}.md`).lane;
}

async function getLanes(ctx) {
	const lanes = await fs.promises.readdir('files');
	ctx.body = lanes; 
};

router.get('/lanes', getLanes);

async function getCards(ctx) {
	const lanes = await getLanesNames();
	const lanesFiles = await Promise.all(lanes.map(lane => fs.promises.readdir(`files/${lane}`)
		.then(files => files.map(file => ({ lane, name: file }))))
	);
	const files = lanesFiles.flat();
	const filesContents = await Promise.all(
		files.map(async file => {
			const content = await getContent(`files/${file.lane}/${file.name}`);
			const newName = file.name.substring(0, file.name.length - 3);
			return { ...file, content, name: newName }
		})
	);
	ctx.body = filesContents; 
};

router.get('/cards', getCards);

async function createCard(ctx) {
	const lane = ctx.request.body.lane;
	const name = uuid.v4();
	await fs.promises.writeFile(`files/${lane}/${name}.md`, '');
	await fs.promises.chown(`files/${lane}/${name}.md`, PUID, PGID);
	ctx.body = name; 
	ctx.status = 201;
}

router.post('/cards', createCard);

async function updateCard(ctx) {
	const oldLane = await getLaneByCardName(ctx.params.card);
	const name = ctx.params.card;
	const newLane = ctx.request.body.lane || oldLane;
	const newName = ctx.request.body.name || name;
	const newcontent = ctx.request.body.content;
	if (newLane !== oldLane || name !== newName) {
		await fs.promises.rename(`files/${oldLane}/${name}.md`, `files/${newLane}/${newName}.md`);
	}
	if (newcontent) {
		await fs.promises.writeFile(`files/${newLane}/${newName}.md`, newcontent);
	}
	await fs.promises.chown(`files/${newLane}/${newName}.md`, PUID, PGID);
	ctx.status = 204;
}

router.patch('/cards/:card', updateCard);

async function deleteCard(ctx) {
	const lane = await getLaneByCardName(ctx.params.card);
	const name = ctx.params.card;
	await fs.promises.rm(`files/${lane}/${name}.md`);
	ctx.status = 204;
}

router.delete('/cards/:card', deleteCard);

async function createCard(ctx) {
	const lane = ctx.request.body.lane;
	const name = uuid.v4();
	await fs.promises.writeFile(`files/${lane}/${name}.md`, '');
	await fs.promises.chown(`files/${lane}/${name}.md`, PUID, PGID);
	ctx.body = name; 
	ctx.status = 201;
}

async function createLane(ctx) {
	const lane = uuid.v4();
	await fs.promises.mkdir(`files/${lane}`);
	await fs.promises.chown(`files/${lane}`, PUID, PGID);
	ctx.body = lane; 
	ctx.status = 201;
}

router.post('/lanes', createLane);

async function updateLane(ctx) {
	const name = ctx.params.lane;
	const newName = ctx.request.body.name;
	await fs.promises.rename(`files/${name}`, `files/${newName}`);
	await fs.promises.chown(`files/${newName}`, PUID, PGID);
	ctx.status = 204;
}

router.patch('/lanes/:lane', updateLane);

async function deleteLane(ctx) {
	const lane = ctx.params.lane;
	await fs.promises.rm(`files/${lane}`, { force: true, recursive: true });
	ctx.status = 204;
}

router.delete('/lanes/:lane', deleteLane);

async function getTitle(ctx) {
	ctx.body = process.env.TITLE;
}

router.get('/title', getTitle);

async function getLanesSort(ctx) {
	const lanes = await fs.promises.readFile('sort/lanes.json')
		.catch(err => [])
	ctx.status = 200;
	ctx.body = lanes;
}

router.get('/sort/lanes', getLanesSort);

async function saveLanesSort(ctx) {
	const newSort = JSON.stringify(ctx.request.body || []);
	await fs.promises.mkdir('sort', { recursive: true });
	await fs.promises.writeFile('sort/lanes.json', newSort);
	await fs.promises.chown('sort/lanes.json', PUID, PGID);
	ctx.status = 200;
}

router.post('/sort/lanes', saveLanesSort);

async function getCardsSort(ctx) {
	const cards = await fs.promises.readFile('sort/cards.json')
		.catch(err => [])
	ctx.status = 200;
	ctx.body = cards;
}

router.get('/sort/cards', getCardsSort);

async function saveCardsSort(ctx) {
	const newSort = (JSON.stringify(ctx.request.body || []));
	await fs.promises.mkdir('sort', { recursive: true });
	await fs.promises.writeFile('sort/cards.json', newSort);
	await fs.promises.chown('sort/cards.json', PUID, PGID);
	ctx.status = 200;
}

router.post('/sort/cards', saveCardsSort);

async function getImage(ctx) {
	await send(ctx, `images/${ctx.params.image}`);
}

router.get('/images/:image', getImage);

async function saveImage(ctx) {
	const imageName = ctx.request.file.originalname;
	await fs.promises.mkdir('images', { recursive: true });
	await fs.promises.writeFile(`images/${imageName}`, ctx.request.file.buffer);
	await fs.promises.chown(`images/${imageName}`, PUID, PGID);
	ctx.status = 204;
}

router.post('/images', multerInstance.single('file'), saveImage);

async function getIsLocalImageUploadEnabled(ctx) {
	ctx.body = ENABLE_LOCAL_IMAGES;
}

router.get('/isLocalImageUploadEnabled', getIsLocalImageUploadEnabled);

app.use(cors());
app.use(bodyParser())
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
		console.error(err)
    err.status = err.statusCode || err.status || 500;
    throw err;
  }
});
app.use(async (ctx, next) => {
	if (BASE_PATH === '/') {
		return next();
	}
	if (ctx.URL.href === `${ctx.URL.origin}${BASE_PATH.substring(0, BASE_PATH.length - 1)}`) {
		ctx.status = 301;
		return ctx.redirect(`${ctx.URL.origin}${BASE_PATH}`);
	}
	await next();
});
app.use(mount(`${BASE_PATH}api`, router.routes()));
app.use(mount(BASE_PATH, serve(path.join(__dirname, '/static'))));
app.listen(8080);