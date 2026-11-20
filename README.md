# API REST del Catalogo de Libros (`librosapi`)

API REST en Node.js y Express para gestionar un catalogo de libros sobre Amazon RDS (MySQL), publicada detras de Nginx como proxy inverso en Amazon EC2 y automatizada mediante GitHub Actions y GitHub Container Registry (`ghcr.io`).

- **Autor:** Said Lira
- **URL publica de la API:** `http://18.226.85.238`
- **Repositorio:** `https://github.com/saidliradiaz-lgtm/librosapi`

## Arquitectura e infraestructura AWS (`us-east-2`)

Todos los recursos de red, computo y base de datos se crearon dentro de la misma VPC (`vpc-0592d28e93ed226ae`) con grupos de seguridad independientes:

- **EC2 (`ec2-libros-said-lira`):** instancia Linux Ubuntu Server 24.04 (`t3.micro`) con Nginx escuchando en el puerto `80` y reenviando peticiones hacia `127.0.0.1:3000`.
  - Grupo de seguridad `ec2-libros-said-lira-sg` (`sg-0a515d717e863aa67`): permite `HTTP (80)` desde `0.0.0.0/0` y `SSH (22)` restringido a la IP de administracion. El puerto `3000` permanece cerrado a Internet.
- **RDS (`rds-libros-said-lira`):** instancia MySQL (`db.t4g.micro`) con **acceso publico deshabilitado** (`Publicly accessible: No`) y base de datos `catalogo_libros`.
  - Grupo de seguridad `rds-libros-said-lira-sg` (`sg-094e5603a067ef7b5`): permite `MySQL/Aurora (3306)` exclusivamente desde el grupo de seguridad `ec2-libros-said-lira-sg`.

## Endpoints disponibles

| Metodo y ruta | Descripcion | Codigos de respuesta |
|---|---|---|
| `GET /health` | Estado general y version del servicio | `200` |
| `GET /libros` | Lista los libros almacenados en RDS | `200` |
| `GET /libros/:id` | Obtiene un libro por identificador | `200`, `400`, `404` |
| `POST /libros` | Crea un nuevo libro validando sus campos | `201`, `400` |
| `PUT /libros/:id` | Actualiza un libro existente | `200`, `400`, `404` |
| `DELETE /libros/:id` | Elimina un libro por identificador | `200`, `400`, `404` |

## Ejecucion local y pruebas

1. Copia el archivo de ejemplo y completa tus credenciales locales o de prueba:
   ```bash
   cp .env.example .env
   ```
2. Crea la base de datos y la tabla `libros` ejecutando `db.sql` en MySQL:
   ```bash
   mysql -h <HOST> -u <USUARIO> -p < db.sql
   ```
3. Instala dependencias y arranca el servidor:
   ```bash
   npm ci
   npm start
   ```
4. Ejecuta las pruebas automatizadas con Jest y Supertest (no requieren conexion a RDS):
   ```bash
   npm test
   ```
5. Construye y prueba el contenedor Docker:
   ```bash
   docker build -t librosapi:local .
   docker run --rm -p 127.0.0.1:3000:3000 --env-file .env librosapi:local
   ```
