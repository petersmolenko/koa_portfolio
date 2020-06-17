const Koa = require('koa');
const app = new Koa();
const fs = require('fs');
const static = require('koa-static');
const session = require('koa-session');
const Pug = require('koa-pug');
const pug = new Pug({
  viewPath: './views',
  pretty: false,
  basedir: './views',
  noCache: true,
  app: app, // equals to pug.use(app) and app.use(pug.middleware)
});
const flash = require('koa-flash-simple');
const errorHandler = require('./libs/error');
const config = require('./config');
const router = require('./routes');
const port = process.env.PORT || 8000;

app.use(static('./public'));

app.use(errorHandler);

app
  .use(session(config.session, app))
  .use(flash())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(port, () => {
  if (!fs.existsSync(config.upload)) {
    fs.mkdirSync(config.upload);
  }
  console.log(`> Ready On Server http://localhost:${port}`);
});