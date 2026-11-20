/**
 * Valida que el identificador recibido en la ruta sea un entero positivo.
 */
function validarId(valor) {
  if (typeof valor === 'number') {
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  }
  if (typeof valor !== 'string' || !/^\d+$/.test(valor.trim())) {
    return null;
  }
  const numero = Number.parseInt(valor.trim(), 10);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Valida los datos de entrada para crear o actualizar un libro en el catalogo.
 */
function validarLibro(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valido: false,
      errores: ['El cuerpo de la solicitud debe ser un objeto JSON valido']
    };
  }

  const errores = [];
  const { titulo, autor, anio_publicacion: anioPublicacion } = body;

  const tituloLimpio = typeof titulo === 'string' ? titulo.trim() : '';
  if (!tituloLimpio) {
    errores.push('El campo titulo es obligatorio y no puede estar vacio');
  } else if (tituloLimpio.length > 200) {
    errores.push('El titulo no puede superar los 200 caracteres');
  }

  const autorLimpio = typeof autor === 'string' ? autor.trim() : '';
  if (!autorLimpio) {
    errores.push('El campo autor es obligatorio y no puede estar vacio');
  } else if (autorLimpio.length > 150) {
    errores.push('El autor no puede superar los 150 caracteres');
  }

  const anioMaximo = new Date().getFullYear() + 1;
  if (
    typeof anioPublicacion !== 'number' ||
    !Number.isInteger(anioPublicacion) ||
    anioPublicacion < 1 ||
    anioPublicacion > anioMaximo
  ) {
    errores.push(
      `El campo anio_publicacion debe ser un numero entero entre 1 y ${anioMaximo}`
    );
  }

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  return {
    valido: true,
    datos: {
      titulo: tituloLimpio,
      autor: autorLimpio,
      anio_publicacion: anioPublicacion
    }
  };
}

module.exports = {
  validarId,
  validarLibro
};
