const request = require('supertest');
const crearApp = require('../src/app');

function crearRepositorioEnMemoria(datosIniciales = []) {
  let libros = datosIniciales.map((item) => ({ ...item }));
  let siguienteId = libros.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  return {
    async listar() {
      return [...libros].sort((a, b) => a.id - b.id);
    },

    async obtenerPorId(id) {
      return libros.find((item) => item.id === id) || null;
    },

    async crear({ titulo, autor, anio_publicacion }) {
      const nuevo = {
        id: siguienteId++,
        titulo,
        autor,
        anio_publicacion
      };
      libros.push(nuevo);
      return { ...nuevo };
    },

    async actualizar(id, { titulo, autor, anio_publicacion }) {
      const indice = libros.findIndex((item) => item.id === id);
      if (indice === -1) {
        return null;
      }
      libros[indice] = {
        id,
        titulo,
        autor,
        anio_publicacion
      };
      return { ...libros[indice] };
    },

    async eliminar(id) {
      const totalAnterior = libros.length;
      libros = libros.filter((item) => item.id !== id);
      return libros.length < totalAnterior;
    }
  };
}

describe('API REST del catalogo de libros', () => {
  let app;

  beforeEach(() => {
    const repo = crearRepositorioEnMemoria([
      {
        id: 1,
        titulo: 'El tunel',
        autor: 'Ernesto Sabato',
        anio_publicacion: 1948
      }
    ]);
    app = crearApp(repo);
  });

  describe('GET /health', () => {
    it('devuelve 200 y confirma que el servicio esta activo', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('ok');
      expect(res.body.servicio).toBe('librosapi');
      expect(res.body.version).toBe('1.1.0');
      expect(res.body.mensaje).toBe('Catalogo de libros operativo');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('POST /libros', () => {
    it('crea un libro valido y responde con 201', async () => {
      const nuevoLibro = {
        titulo: '  Cien anos de soledad  ',
        autor: 'Gabriel Garcia Marquez',
        anio_publicacion: 1967
      };

      const res = await request(app).post('/libros').send(nuevoLibro);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 2,
        titulo: 'Cien anos de soledad',
        autor: 'Gabriel Garcia Marquez',
        anio_publicacion: 1967
      });
    });

    it('rechaza con 400 cuando titulo o autor estan vacios', async () => {
      const res = await request(app).post('/libros').send({
        titulo: '   ',
        autor: '',
        anio_publicacion: 1955
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Datos de libro invalidos');
      expect(Array.isArray(res.body.detalles)).toBe(true);
      expect(res.body.detalles.length).toBeGreaterThanOrEqual(2);
    });

    it('rechaza con 400 cuando anio_publicacion no es un entero valido', async () => {
      const casosInvalidos = [
        { titulo: 'Pedro Paramo', autor: 'Juan Rulfo', anio_publicacion: '1955' },
        { titulo: 'Pedro Paramo', autor: 'Juan Rulfo', anio_publicacion: 1955.5 },
        { titulo: 'Pedro Paramo', autor: 'Juan Rulfo', anio_publicacion: -5 },
        { titulo: 'Pedro Paramo', autor: 'Juan Rulfo', anio_publicacion: 0 }
      ];

      for (const payload of casosInvalidos) {
        const res = await request(app).post('/libros').send(payload);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Datos de libro invalidos');
      }
    });

    it('rechaza con 400 cuando el JSON esta malformado', async () => {
      const res = await request(app)
        .post('/libros')
        .set('Content-Type', 'application/json')
        .send('{"titulo": "Ficciones",');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El cuerpo JSON esta malformado');
    });
  });

  describe('GET /libros y GET /libros/:id', () => {
    it('devuelve la lista de libros registrados', async () => {
      const res = await request(app).get('/libros');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].titulo).toBe('El tunel');
    });

    it('devuelve 200 al consultar un libro existente por id', async () => {
      const res = await request(app).get('/libros/1');

      expect(res.status).toBe(200);
      expect(res.body.autor).toBe('Ernesto Sabato');
    });

    it('devuelve 404 cuando el libro solicitado no existe', async () => {
      const res = await request(app).get('/libros/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Libro no encontrado');
    });

    it('devuelve 400 cuando el id no es un entero positivo', async () => {
      const res = await request(app).get('/libros/abc');

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /libros/:id', () => {
    it('actualiza un libro existente y devuelve 200', async () => {
      const res = await request(app).put('/libros/1').send({
        titulo: 'Sobre heroes y tumbas',
        autor: 'Ernesto Sabato',
        anio_publicacion: 1961
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 1,
        titulo: 'Sobre heroes y tumbas',
        autor: 'Ernesto Sabato',
        anio_publicacion: 1961
      });
    });

    it('devuelve 404 al intentar actualizar un libro inexistente', async () => {
      const res = await request(app).put('/libros/999').send({
        titulo: 'Ficciones',
        autor: 'Jorge Luis Borges',
        anio_publicacion: 1944
      });

      expect(res.status).toBe(404);
    });

    it('devuelve 400 cuando los datos de actualizacion son invalidos', async () => {
      const res = await request(app).put('/libros/1').send({
        titulo: '',
        autor: 'Ernesto Sabato',
        anio_publicacion: 1948
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /libros/:id', () => {
    it('elimina un libro existente y posteriormente responde 404', async () => {
      const resDelete = await request(app).delete('/libros/1');
      expect(resDelete.status).toBe(200);
      expect(resDelete.body.id).toBe(1);

      const resGet = await request(app).get('/libros/1');
      expect(resGet.status).toBe(404);
    });

    it('devuelve 404 al intentar eliminar un libro que no existe', async () => {
      const res = await request(app).delete('/libros/999');
      expect(res.status).toBe(404);
    });
  });
});
