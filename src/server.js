require('dotenv').config();
const env = require('./config/env');
const crearApp = require('./app');
const librosRepository = require('./repositories/librosRepository');

const app = crearApp(librosRepository);

app.listen(env.port, () => {
  console.log(`API ${require('../package.json').name} escuchando en el puerto ${env.port}`);
});
