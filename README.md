# API REST del Catalogo de Libros (`librosapi`)

Solucion integral de los **Ejercicios 1 y 2** para la gestion de un catalogo de libros mediante una API REST construida con **Node.js** y **Express**, conectada a **Amazon RDS (MySQL)** y publicada detras de **Nginx** en **Amazon EC2**, con integracion y despliegue continuos (**CI/CD**) en **GitHub Actions** y **GitHub Container Registry (`ghcr.io`)**.

- **Autor:** Said Lira
- **URL publica de la API:** `http://18.226.85.238`
- **Repositorio publico:** `https://github.com/saidliradiaz-lgtm/librosapi`
- **Paquete Docker en GHCR:** `https://github.com/saidliradiaz-lgtm/librosapi/pkgs/container/librosapi`

## Enlaces directos a ejecuciones exitosas de CI y CD

- **CI en `main` (`v1.1.0`):** [Ejecucion exitosa de CI #44660521629](https://github.com/saidliradiaz-lgtm/librosapi/actions/runs/44660521629)
- **CI en Pull Request #1 (sin disparo de CD):** [Ejecucion exitosa de CI #44659151147](https://github.com/saidliradiaz-lgtm/librosapi/actions/runs/44659151147)
- **CD en `main` (`test` -> `build-and-push` -> `deploy`):** [Ejecucion exitosa de CD #44660521621](https://github.com/saidliradiaz-lgtm/librosapi/actions/runs/44660521621)

---

## Infraestructura utilizada en AWS (`us-east-2`)

Todos los recursos de esta practica se crearon dentro de la misma VPC (`vpc-0592d28e93ed226ae`) con grupos de seguridad independientes:

| Recurso | Identificador | Configuracion principal |
|---|---|---|
| Instancia EC2 | `ec2-libros-said-lira` (`i-0f6bbf6b796021bad`) | Ubuntu Server 24.04 LTS (`t3.micro`), IP publica `18.226.85.238`, Docker y Nginx en puerto `80`. |
| Grupo de seguridad EC2 | `ec2-libros-said-lira-sg` (`sg-0a515d717e863aa67`) | Entrada: `HTTP (80)` desde `0.0.0.0/0` y `SSH (22)` restringido a la IP de administracion. Puerto `3000` cerrado a Internet. |
| Instancia RDS MySQL | `rds-libros-said-lira` | MySQL Community (`db.t4g.micro`), base inicial `catalogo_libros`, **acceso publico deshabilitado** (`Publicly accessible: No`). |
| Grupo de seguridad RDS | `rds-libros-said-lira-sg` (`sg-094e5603a067ef7b5`) | Entrada: `MySQL/Aurora (3306)` aceptada **unicamente** desde `ec2-libros-said-lira-sg`. |
| Usuario IAM para CD | `cd-libros-said-lira` | Politica minima limitada a `ec2:AuthorizeSecurityGroupIngress` y `ec2:RevokeSecurityGroupIngress` sobre `sg-0a515d717e863aa67` durante el despliegue. |

En la instancia EC2, la configuracion de conexion hacia RDS vive fuera del repositorio y fuera de la imagen Docker en `/opt/librosapi/.env` (permisos `600`). El contenedor escucha unicamente en `127.0.0.1:3000` y recibe el trafico externo a traves del proxy inverso de Nginx en el puerto `80`.

---

## Endpoints y validaciones

| Metodo y ruta | Comportamiento | Codigos HTTP |
|---|---|---|
| `GET /health` | Verifica estado operativo, servicio y version actual (`1.1.0`) | `200` |
| `GET /libros` | Devuelve el listado completo de libros almacenados en RDS | `200` |
| `GET /libros/:id` | Devuelve el detalle de un libro por ID | `200`, `400`, `404` |
| `POST /libros` | Valida e inserta un nuevo libro en RDS | `201`, `400` |
| `PUT /libros/:id` | Valida y actualiza un libro existente en RDS | `200`, `400`, `404` |
| `DELETE /libros/:id` | Elimina un libro existente de RDS | `200`, `400`, `404` |

Todas las operaciones SQL en `src/repositories/librosRepository.js` utilizan consultas parametrizadas con `mysql2/promise` (`pool.execute`). La capa de validacion (`src/validators/libroValidator.js`) exige que `titulo` y `autor` no esten vacios y que `anio_publicacion` sea un numero entero valido.

---

## Como ejecutar localmente y correr pruebas

### 1. Configuracion e inicio de la API

1. Copia el archivo de ejemplo y completa tus variables de conexion a MySQL:
   ```bash
   cp .env.example .env
   ```
2. Crea la base de datos y la tabla `libros` ejecutando `db.sql`:
   ```bash
   mysql -h <HOST> -u <USUARIO> -p < db.sql
   ```
3. Instala dependencias exactas y ejecuta el servidor:
   ```bash
   npm ci
   npm start
   ```

### 2. Pruebas automatizadas (Jest y Supertest)

Las pruebas usan un doble en memoria inyectado en `crearApp(repositorio)` y se ejecutan **sin requerir una instancia RDS real**:

```bash
npm test
```

### 3. Construccion y prueba local con Docker

```bash
docker build -t librosapi:local .
docker run --rm -p 127.0.0.1:3000:3000 --env-file .env librosapi:local
```

Luego verifica `http://127.0.0.1:3000/health`.

---

## Verificacion del despliegue en produccion

Comprobacion de salud, consulta de libros y cierre del puerto `3000` contra la instancia EC2:

```bash
# Salud del servicio (espera 200 OK y version 1.1.0)
curl -i http://18.226.85.238/health

# Crear un libro
curl -i -X POST http://18.226.85.238/libros \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Pedro Paramo","autor":"Juan Rulfo","anio_publicacion":1955}'

# Consultar catalogo completo
curl -i http://18.226.85.238/libros

# Actualizar un libro existente (sustituir {id})
curl -i -X PUT http://18.226.85.238/libros/{id} \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Pedro Paramo (Edicion revisada)","autor":"Juan Rulfo","anio_publicacion":1955}'

# Eliminar un libro existente (sustituir {id})
curl -i -X DELETE http://18.226.85.238/libros/{id}

# Verificar que el puerto 3000 no esta expuesto directamente a Internet (debe agotar tiempo)
curl --connect-timeout 3 http://18.226.85.238:3000/health
```

---

## Flujo CI/CD

- **CI (`.github/workflows/ci.yml`):** se ejecuta en cada `push` y `pull_request` hacia `main`. Instala dependencias con `npm ci` y ejecuta `npm test`; cualquier fallo detiene el flujo.
- **CD (`.github/workflows/cd.yml`):** se ejecuta **unicamente** ante cambios incorporados en `main` (`push` a `main`, nunca en `pull_request`). Consta de tres trabajos encadenados:
  1. `test`: ejecuta `npm ci` y `npm test`.
  2. `build-and-push` (`needs: test`): construye la imagen Docker y la publica en `ghcr.io` etiquetada con `${{ github.sha }}` y `:latest`.
  3. `deploy` (`needs: build-and-push`): autoriza temporalmente la IP del runner en el puerto `22` de `EC2_SG_ID`, despliega el nuevo contenedor en `127.0.0.1:3000` leyendo `/opt/librosapi/.env`, valida `/health` y `/libros` a traves de Nginx, y realiza **rollback automatico** a la version previa (`librosapi-prev`) marcando fallo si la comprobacion no supera las pruebas. La regla temporal de SSH se revoca siempre (`if: always()`).

---

## Evidencias (`evidencias/`)

| Archivo | Contenido verificado |
|---|---|
| `evidencias/01-ec2-instancia.png` | Instancia EC2 `ec2-libros-said-lira` en ejecucion, VPC e IP publica. |
| `evidencias/02-ec2-security-group.png` | Reglas de entrada de `ec2-libros-said-lira-sg` (SSH restringido y HTTP 80). |
| `evidencias/03-rds-instancia-privada.png` | Instancia RDS `rds-libros-said-lira` en la misma VPC y sin acceso publico. |
| `evidencias/04-rds-security-group.png` | Regla de entrada de `rds-libros-said-lira-sg` (puerto 3306 solo desde EC2 SG). |
| `evidencias/05-crud-y-persistencia-rds.png` | Operaciones CRUD completas via `curl` y consulta directa `SELECT * FROM libros` en RDS. |
| `evidencias/06-pruebas-jest.png` | Ejecucion exitosa de las 14 pruebas automatizadas con `npm test` (Jest + Supertest). |
| `evidencias/07-imagen-ghcr-publicada.png` | Imagen Docker publicada en `ghcr.io` etiquetada con el SHA del commit. |
| `evidencias/08-github-actions-ci.png` | Ejecucion exitosa del workflow de CI en GitHub Actions. |
| `evidencias/09-github-actions-cd.png` | Ejecucion exitosa de los 3 trabajos del workflow de CD en GitHub Actions. |
| `evidencias/10-despliegue-version-actualizada.png` | Verificacion en vivo de `/health` (`v1.1.0`), `/libros` y bloqueo del puerto 3000. |
