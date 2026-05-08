# Plan de testing del proyecto

Guía punto-a-punto para cubrir la API con tests. **No incluye código de tests** —
es la hoja de ruta y los criterios. La implementación va después.

---

## 0. Estrategia general

### 0.1 Pirámide de tests para esta arquitectura

El proyecto sigue una arquitectura por capas (router → controller → repo →
prisma). Cada capa pide una estrategia diferente:

```
       ┌─────────────────────────┐
       │   E2E / API tests       │   pocos, lentos, valor alto
       │   (supertest + DB test) │
       ├─────────────────────────┤
       │   Integración           │   medios
       │   (repo + DB test)      │
       ├─────────────────────────┤
       │   Unitarios             │   muchos, rápidos
       │   (services, controllers│
       │    middleware, errors)  │
       └─────────────────────────┘
```

- **Unitarios**: aíslan una clase/función mockeando colaboradores. Son la base.
- **Integración (repo)**: usan **Postgres real** (`films_test_db`) sin mocks de
  Prisma. Validan que las queries son correctas.
- **E2E (API)**: arrancan `createApp(prisma)` y disparan HTTP con `supertest`.
  Cubren el ensamblaje completo: router + middleware + controller + repo + DB.

Regla práctica: **escribe muchos unitarios y pocos E2E**. Si dudas dónde poner
la lógica, ponla donde sea más fácil de testar (normalmente el repo o el
service), no en el controller.

### 0.2 Criterio "qué mockear, qué no"

| Cosa | ¿Mockear? | Por qué |
|---|---|---|
| `env.ts` | **Sí** en unitarios | Llama a `process.exit(1)` si faltan vars |
| `bcryptjs`, `jsonwebtoken`, `zod` | **No** | Puros, deterministas, rápidos |
| Prisma client en repos | **No** (usar DB de test) | Los mocks de Prisma mienten sobre el SQL real |
| Prisma client en controllers/middleware | **Sí** (mock del repo) | Aislar la capa |
| `debug` | **No** | Side-effect benigno |
| `Date.now()` | **Sí** si el test depende de tiempo | No determinista |
| `console.log` / `console.error` | **Sí** si quieres silenciar la suite | Estética |

---

## 1. Configuración previa

### 1.1 Vitest (ya existe)

`vitest.config.js` con `globals: true`. Esto da `describe`, `test`, `expect`,
`vitest`/`vi` sin imports. Dejarlo así.

### 1.2 Variables de entorno de test

`.env.test` ya creado, apunta a `films_test_db`. Verificar que:

- `NODE_ENV=test`
- `PGDATABASE=films_test_db` (BBDD separada de dev — fundamental)
- `JWT_SECRET` con ≥32 chars (lo exige el schema de zod)
- `PORT` distinto al de dev (3001)

### 1.3 Base de datos de test

- BBDD `films_test_db` ya creada en el contenedor `films_postgres`.
- Aplicar schema: `npx prisma db push --config prisma.test.config.ts`
- Seed inicial (opcional): `npm run seed:test`
- **Estrategia de aislamiento entre tests**: limpiar tablas antes de cada test
  (`TRUNCATE ... RESTART IDENTITY CASCADE`) o usar transacciones que se
  revierten al final. Decidir esto antes de escribir el primer test de repo.

### 1.4 Scripts npm necesarios

Tu `package.json` ya tiene:
- `test` → `vitest` (modo watch)
- `test:c` → `vitest run --coverage`
- `seed:test` → preparar BBDD de test

Sugerencia: añadir un alias **`test:run`** para ejecución única en CI:
```json
"test:run": "vitest run"
```

### 1.5 Dependencias adicionales que necesitarás

Solo cuando empieces los E2E:
```
npm i -D supertest @types/supertest
```
Para tests de repo no hace falta nada extra — usas el Prisma real con la BBDD
de test.

### 1.6 Estructura de archivos

Convención sugerida: el test convive con el código (`auth.ts` ↔ `auth.test.ts`).
Ya lo estáis haciendo así. Mantener.

Para fixtures y helpers compartidos crear:
```
src/test-utils/
  ├─ db-cleanup.ts       # truncate de tablas
  ├─ factories.ts        # builders de Users/Films/Genres/Reviews
  ├─ http-mocks.ts       # mockReq, mockRes, mockNext
  └─ auth-tokens.ts      # genera JWT válidos para tests
```

---

## 2. Plan de testing por capas

### 2.1 `src/services/auth.ts` — UNITARIO ✅ (ya hecho)

Cubre: `hash`, `compare`, `generateToken`, `verifyToken`. Ver `auth.test.ts`.

---

### 2.2 `src/config/env.ts` — UNITARIO

**Qué probar**:
- Carga correcta cuando todas las vars están presentes y bien.
- Falla (process.exit) cuando falta una var requerida.
- Falla cuando `JWT_SECRET` tiene <32 chars.
- Coerce numérico de `PORT` y `PGPORT` (string en `process.env` → number).

**Mocks necesarios**:
- `process.exit` (con `vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)`).
- Restaurar `process.env` original con `beforeEach`/`afterEach`.

**Truco**: como `env.ts` se ejecuta al importar, hay que usar
`vi.resetModules()` + `await import('./env.ts')` dentro de cada test para
forzar reevaluación con el `process.env` que tú controlas.

---

### 2.3 `src/config/db-config.ts` — INTEGRACIÓN ligera

**Qué probar**:
- `connectDB()` devuelve un cliente Prisma usable contra la BBDD de test.
- Lanza error si las credenciales son malas.

**Por qué integración**: probar `connectDB` con prisma mockeado es inútil — no
verifica nada real. Dale credenciales válidas (de `.env.test`) y conecta de
verdad. Es lento (~100ms) pero corre 1 vez, no por test.

**Estrategia alternativa**: skip directo y confía en que los tests de repo lo
ejercitan transitivamente. Recomendado si el tiempo aprieta.

---

### 2.4 `src/errors/*.ts` — UNITARIO mínimo

`http-error.ts` y `basic-errors.ts` son solo clases con `status`,
`statusMessage`, `message`.

**Qué probar**:
- Constructor asigna `status` y `statusMessage` correctos por subclase
  (`NotFoundError` → 404, `UnauthorizedError` → 401, etc.).
- `cause` se propaga si se pasa por opciones.
- `instanceof HttpError` funciona para todas las subclases.

**Mocks**: ninguno. Clases puras.

Tests recomendados: ~1 test por subclase + 1 para la base = 5–6 tests, todos
de ~5 líneas.

---

### 2.5 `src/middleware/*.ts` — UNITARIO

Son funciones `(req, res, next) => ...`. Se testan con dobles de Express.

#### `auth.interceptor.ts` (`AuthInterceptor`)

**Qué probar** (3 métodos):

`authenticate`:
- Sin header `Authorization` → `next(UnauthorizedError)`.
- Con header malformado (no `Bearer ...`) → `next(UnauthorizedError)`.
- Con token inválido → `next(UnauthorizedError)`.
- Con token válido → setea `req.user` y llama `next()` sin error.

`authorize(roles)`:
- Sin `req.user` → `next(UnauthorizedError)`.
- Rol no incluido y no es ADMIN → `next(ForbiddenError)`.
- ADMIN → `next()` sin error (bypass).
- Rol incluido → `next()` sin error.

`isOwnerOrAdmin`:
- Sin `req.user` → unauthorized.
- Usuario no ADMIN cuyo `id` ≠ `params.id` → forbidden.
- ADMIN → pasa.
- Usuario cuyo `id` === `params.id` → pasa.

**Mocks**:
- `env.ts` (mismo patrón que en auth.test.ts).
- `req`, `res`, `next` con factories propios (ver §1.6 → `http-mocks.ts`).
- Para los tokens, **no mockees jwt**: genera tokens reales con
  `AuthService.generateToken()` para los tests felices.

#### `error-handler.ts`

**Qué probar**:
- `HttpError` → setea `status`, `statusMessage`, `send(message)`.
- `PrismaClientKnownRequestError` con code `NOT_FOUND` → 404.
- `ZodError` → 400 + `res.json(issues)`.
- `Error` genérico → 500 + `send(message)`.
- No-Error (cualquier valor) → 500 + `send(value)`.

**Mocks**: solo `req`/`res`/`next`. Las clases de error son reales.

#### `custom-headers.ts`

Lee → confirma que añade los headers esperados a `res`. 1–2 tests.

#### `invalid-handler.ts`

Confirma que para una ruta no registrada llama a `next` con un `NotFoundError`
(o lo que devuelva).

#### `validations.ts`

Testar cada middleware de validación zod:
- Body inválido → llama `next(ZodError)`.
- Body válido → llama `next()` y NO toca `req.body` (o lo toca según diseño).

---

### 2.6 `src/{users,films,genres,reviews}/repos/*.repo.ts` — INTEGRACIÓN

**Reglas**:
1. **No mockear Prisma**. Usar `films_test_db` real.
2. Limpiar tablas antes de cada test (`beforeEach`).
3. Sembrar SOLO los datos que el test necesita (no usar el seed global).

**Por qué integración y no unit**: un mock de Prisma se construye replicando
la API que tu propio código llama. Si tu código llama mal a Prisma, el mock
también lo "acepta" mal y el test pasa con SQL roto. La única forma de validar
queries Prisma es ejecutarlas contra Postgres.

#### Plan común para cada repo

Por cada método CRUD:
- **Happy path**: input válido → resultado esperado (forma, tipos, relaciones).
- **Not found**: id que no existe → lanza `PrismaClientKnownRequestError` con
  code `P2025`.
- **Conflicto / Validación**: e.g. crear user con email duplicado → P2002.
- **Cascadas**: borrar User → ¿se borra Profile? (sí, según schema).
  Confirmar comportamiento en BBDD real.

#### `users.repo.ts` específico

- `register`:
  - Crea user + profile asociado.
  - Hashea la password (compare con la original debe dar true).
  - Email duplicado → P2002.
- `login`:
  - Email correcto + password correcta → devuelve `{token, credentials}`.
  - Email correcto + password incorrecta → `P2004`.
  - Email no existe → `P2025` (lo lanza `findUniqueOrThrow`).
  - Token devuelto es verificable con `AuthService.verifyToken`.
- `getAllUsers`, `getUserById`, `updateUser`, `updateUserProfile`,
  `deleteUser` → estándar CRUD.

#### `films.repo.ts`, `genres.repo.ts`, `reviews.repo.ts`

Mismo patrón. Atención especial a:
- `films`: relación many-to-many con genres (`@@relation("films_genres")`).
- `reviews`: clave compuesta `[userID, filmID]` — testar que crear dos
  reviews del mismo usuario al mismo film falla (P2002).
- `genres`: nombre único.

#### Helper sugerido

`src/test-utils/db-cleanup.ts`:
- Función que hace `TRUNCATE TABLE users, films, genres, reviews, profiles RESTART IDENTITY CASCADE` antes de cada test.
- O alternativamente: envolver cada test en `prisma.$transaction` que se
  revierte. (Más rápido, pero no funciona si el código bajo test usa
  transacciones internas — ojo.)

---

### 2.7 `src/{users,films,genres,reviews}/controllers/*.ts` — UNITARIO

**Mocks**:
- El **repo** correspondiente (mockear toda la clase con `vi.fn()` por método).
- `req`, `res`, `next` con dobles.

**Qué probar** por controller:
- Llama al método correcto del repo con los argumentos correctos.
- En éxito: status code correcto + `res.json(...)` con el payload esperado.
- En error: llama a `next(...)` con el tipo de error correcto:
  - Prisma `P2025` → `NotFoundError`.
  - Otros errores → `InternalServerError`.
  - Login con cualquier `PrismaClientKnownRequestError` → `UnauthorizedError`.

**Anti-patrón a evitar**: testar el contenido del body del response palabra
por palabra. Es frágil. Validar la **forma** (status + presencia de campos
clave) y delegar el contenido fino al test del repo.

#### Ejemplo de plan para `users.controller.ts`

- `register` → 201 + body con user creado, llama `repo.register` con `req.body`.
- `login`:
  - éxito → 200 + `{token, credentials}`.
  - prisma error → `next(UnauthorizedError)`.
  - error genérico → `next(InternalServerError)`.
- `getUserById` → si repo lanza `P2025` → `next(NotFoundError)`.
- `updateUser`, `updateUserProfile`, `deleteUser` → mismo patrón.
- `deleteUser` éxito → status 204 + `res.end()`.

---

### 2.8 `src/{...}/router/*.router.ts` — INTEGRACIÓN ligera (E2E)

Los routers son cableado. Probarlos aislados aporta poco; se cubren por los
tests E2E (§2.10) que pasan por toda la pila.

Si quieres tests dedicados:
- Verificar que cada ruta está registrada con el método correcto.
- Verificar que las rutas protegidas pasan por `authInterceptor.authenticate`
  antes que por el controller.

Esto se puede comprobar inspeccionando `router.stack` pero es frágil.
**Recomendación**: skip dedicado, cubrir por E2E.

---

### 2.9 `src/app.ts` — INTEGRACIÓN ligera

**Qué probar**:
- `createApp(prisma)` devuelve una instancia de express.
- `GET /health` → 200 + `{status: 'ok', timestamp: ...}`.
- `GET /` → 200 + HTML (verificar `Content-Type` o substring).
- `GET /api` → 200.
- Rutas no registradas → 404 (vía `invalidRoutes`).

**Cómo**: con `supertest(app)`. NO hace falta `.listen()`.

```
const app = createApp(prismaTest);
await request(app).get('/health').expect(200);
```

---

### 2.10 E2E por endpoint — INTEGRACIÓN/E2E

Esta es la capa que da confianza real. Por cada recurso (users, films, genres,
reviews), un archivo de tests con flujos completos.

#### Setup compartido

- `beforeAll`: `connectDB()` + `createApp(prisma)`.
- `beforeEach`: limpiar tablas y sembrar mínimos.
- `afterAll`: `prisma.$disconnect()`.

#### Plan para `/api/users`

- **Register**:
  - POST `/api/users/register` con body válido → 201 + user creado en DB.
  - Body inválido (email malo, password corta) → 400 + zod issues.
  - Email duplicado → 500 (o lo que devuelva el error handler para P2002).
- **Login**:
  - Credenciales correctas → 200 + token. Verificar que el token decodifica
    a las credentials del user.
  - Email no existe → 401.
  - Password incorrecta → 401.
- **GET /api/users** (lista):
  - Sin token → 401.
  - Con token de USER (rol normal) → ¿permitido o forbidden? Según diseño
    actual del router. Documentar.
  - Con token de ADMIN → 200 + array.
- **GET /api/users/:id**:
  - Sin token → 401.
  - Token válido pero no es el dueño ni admin → 403.
  - Token del dueño → 200.
  - Token de admin → 200.
  - ID que no existe → 404.
- **PATCH /api/users/:id**, **PATCH /api/users/:id/profile**, **DELETE**:
  - Mismo patrón de auth checks (`isOwnerOrAdmin`).
  - Datos inválidos → 400.
  - Éxito → 200 (o 204 en delete).

#### Plan para `/api/films`, `/api/genres`, `/api/reviews`

Mismo molde. Atender a:

- **Films**:
  - Crear film con array de `genreIds` → asociaciones correctas en
    `films_genres`.
  - Filtros/queries (si el router los soporta): `?title=`, `?year=`.
- **Genres**:
  - Nombre único.
- **Reviews**:
  - Clave compuesta `(userID, filmID)`: dos reviews del mismo par → 409 / 500.
  - Solo el dueño de la review puede borrarla/editarla.

#### Helper de auth para E2E

`src/test-utils/auth-tokens.ts`:
- `createAdminToken()`: crea user ADMIN en DB y devuelve token.
- `createUserToken()`: idem con role USER.
- `createEditorToken()`: idem con role EDITOR.

Así los tests E2E hacen `request(app).get(...).set('Authorization', `Bearer ${token}`)`
sin pelearse con la creación de tokens en cada test.

---

### 2.11 `src/server.ts` — SMOKE TEST opcional

`startServer` es bootstrap. Cubrirlo aporta poco una vez tienes E2E sobre
`createApp`. Si quieres un smoke test:

- Llama a `startServer()`, espera `'listening'`, asserta `server.address()`,
  cierra con `server.close()`.

No probar en CI con BBDD real es lo más práctico.

---

### 2.12 `src/index.ts` — NO TESTAR

Es solo el entrypoint con `await startServer()` top-level. Cualquier valor que
añada un test sobre él lo cubre `server.ts` o los E2E.

---

### 2.13 `src/views/home.ts` — UNITARIO o SKIP

Si `HomeView.render(boolean)` parsea markdown con `marked` y `gray-matter`:
- 1–2 tests verificando que devuelve string con HTML válido.
- Que el flag `true` vs `false` produce salidas distintas.

Bajo valor → opcional.

---

## 3. Patrones y recetas

### 3.1 Mockear `env.ts` (receta estándar)

```ts
vitest.mock('../config/env.ts', () => ({
    env: {
        JWT_SECRET: 'test_secret_'.padEnd(32, 'x'),
        PROJECT_NAME: 'test',
        // … añadir lo que use el SUT
    },
}));
```

Repítelo en cada archivo de test que importe (directa o transitivamente)
`env.ts`. Vitest hoistea las llamadas a `vitest.mock` al inicio del archivo.

### 3.2 Dobles de `req`, `res`, `next`

Plantilla mental (no implementación):
- `req`: objeto plano con `body`, `params`, `headers`, `user`. Sobreescribir
  por test.
- `res`: objeto con `status`, `json`, `send`, `end` como `vi.fn()` que
  retornan `this` (chainable). Útil para `expect(res.status).toHaveBeenCalledWith(201)`.
- `next`: `vi.fn()`. Aserta llamadas con
  `expect(next).toHaveBeenCalledWith(expect.any(NotFoundError))`.

Centralizar en `src/test-utils/http-mocks.ts`.

### 3.3 Limpieza de BBDD entre tests

```sql
TRUNCATE TABLE reviews, profiles, users, "_films_genres", films, genres
RESTART IDENTITY CASCADE;
```

(La tabla pivote de la relación many-to-many se llama `_films_genres` o
similar — verificar con `\dt` en psql tras `prisma db push`.)

Wrappear en función `cleanDb(prisma)` y llamarla desde `beforeEach`.

### 3.4 Factories de datos

Patrón builder por entidad. Plan, sin código:
- `userFactory(overrides?: Partial<User>)`: devuelve un user mínimo viable
  con email único (incluir un counter o uuid corto para evitar colisiones).
- `filmFactory(overrides?)`, `genreFactory(overrides?)`, etc.
- `seedUser(prisma, overrides?)`: factory + insert + return persisted entity.

### 3.5 Cobertura

- Activar con `npm run test:c`.
- Objetivos razonables:
  - Services, errors, middleware, controllers: **≥ 90%** (son lógica pura
    o casi).
  - Repos: **≥ 80%** (los happy paths cubren mucho; los errores raros menos).
  - App / server / index: bajo, no perseguir.
- No persigas 100% — los últimos 5% suelen ser ramas defensivas que cuesta
  más probar que el bug que protegen.

---

## 4. Orden de implementación recomendado

Hacer en este orden, validando que cada bloque pasa antes de pasar al siguiente:

1. **errors/** — clases puras, calientan el grupo.
2. **middleware/error-handler.ts** — base de los demás.
3. **middleware/auth.interceptor.ts** — desbloquea tests E2E.
4. **middleware/validations.ts** y **custom-headers.ts**.
5. **test-utils/** — http-mocks, factories, db-cleanup, auth-tokens. Sin esto
   los tests siguientes son más verbosos.
6. **users.repo.ts** — el repo más rico (auth, hashing, relaciones).
7. **films.repo.ts**, **genres.repo.ts**, **reviews.repo.ts**.
8. **users.controller.ts** y resto de controllers.
9. **app.ts** — `/health`, `/`, `/api`.
10. **E2E /api/users** completo.
11. **E2E /api/films, /genres, /reviews**.
12. **(Opcional)** env.ts, server.ts, views.

Justificación: empezar por lo aislado (errors, middleware) construye
confianza. Los test-utils llegan justo cuando los necesitas. Los E2E al
final porque son los más caros de escribir y mantener — antes de eso ya
tienes red de seguridad por debajo.

---

## 5. Comandos de referencia

```
# Suite completa, una sola vez (CI)
npx vitest run

# Watch mode (dev)
npm test

# Con cobertura
npm run test:c

# Un solo archivo
npx vitest run src/services/auth.test.ts

# Un solo test (filtro por nombre)
npx vitest run -t "should hash"

# Preparar BBDD de test desde cero
npm run seed:test
```

---

## 6. Glosario rápido

- **SUT**: Subject Under Test. La unidad que estás probando.
- **AAA**: Arrange · Act · Assert. Estructura de cada test.
- **Doble**: cualquier sustituto de un colaborador en un test (mock, stub, spy,
  fake). En vitest, `vi.fn()` cubre la mayoría.
- **Happy path**: input válido / camino exitoso.
- **Sad path**: errores, excepciones, datos inválidos.
- **Round-trip**: probar dos operaciones inversas juntas (sign↔verify,
  hash↔compare). Valida comportamiento sin mockear.
