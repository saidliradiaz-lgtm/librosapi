const express = require('express');
const { validarId, validarLibro } = require('../validators/libroValidator');

function crearRutasLibros(repositorio) {
  const router = express.Router();

  router.get('/', async (_req, res, next) => {
    try {
      const libros = await repositorio.listar();
      res.status(200).json(libros);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = validarId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'El identificador del libro debe ser un entero positivo' });
      }

      const libro = await repositorio.obtenerPorId(id);
      if (!libro) {
        return res.status(404).json({ error: 'Libro no encontrado' });
      }

      return res.status(200).json(libro);
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const validacion = validarLibro(req.body);
      if (!validacion.valido) {
        return res.status(400).json({
          error: 'Datos de libro invalidos',
          detalles: validacion.errores
        });
      }

      const libroCreado = await repositorio.crear(validacion.datos);
      return res.status(201).json(libroCreado);
    } catch (error) {
      return next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const id = validarId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'El identificador del libro debe ser un entero positivo' });
      }

      const validacion = validarLibro(req.body);
      if (!validacion.valido) {
        return res.status(400).json({
          error: 'Datos de libro invalidos',
          detalles: validacion.errores
        });
      }

      const libroActualizado = await repositorio.actualizar(id, validacion.datos);
      if (!libroActualizado) {
        return res.status(404).json({ error: 'Libro no encontrado' });
      }

      return res.status(200).json(libroActualizado);
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const id = validarId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'El identificador del libro debe ser un entero positivo' });
      }

      const eliminado = await repositorio.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Libro no encontrado' });
      }

      return res.status(200).json({
        mensaje: 'Libro eliminado correctamente',
        id
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = crearRutasLibros;
