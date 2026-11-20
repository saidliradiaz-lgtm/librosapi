const express = require('express');
const pkg = require('../package.json');
const crearRutasLibros = require('./routes/librosRoutes');

function crearApp(repositorio) {
  const app = express();

  app.use(express.json());

  // Captura errores de sintaxis cuando el cliente envia un JSON malformado
  app.use((err, _req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'El cuerpo JSON esta malformado' });
    }
    return next(err);
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({
      estado: 'ok',
      servicio: pkg.name,
      version: pkg.version,
      mensaje: 'Catalogo de libros operativo',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/libros', crearRutasLibros(repositorio));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.use((err, _req, res, _next) => {
    console.error('Error inesperado en la API:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = crearApp;
