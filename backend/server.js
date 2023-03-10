const Koa = require('koa');
const app = new Koa();
const router = require('@koa/router')();
const fs = require('fs');
const uuid = require('uuid');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const PUID = Number(process.env.PUID || '1000');
const PGID = Number(process.env.PGID || '1000');

function getContent(path) {
	return fs.promises.readFile(path).then(res => res.toString());
}

function getLanesNames() {
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
app.use(router.routes())
app.listen(3001);