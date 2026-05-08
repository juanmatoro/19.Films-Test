# Cómo testear el proyecto — guía práctica

Recetas con código de ejemplo para cada tipo de test. Copia el patrón,
adáptalo al fichero que toque.

---

## 1. Antes de empezar

### 1.1 Setup mínimo

```bash
# Test DB lista (ya creada)
npm run seed:test

# Para tests E2E necesitarás:
npm i -D supertest @types/supertest
```

`vitest.config.js` ya tiene `globals: true`, así que `describe`, `test`,
`expect`, `vitest`/`vi` están disponibles sin import.

### 1.2 Comandos

```bash
npx vitest run                      # toda la suite, una vez
npm test                            # watch mode
npx vitest run src/services/        # solo una carpeta
npx vitest run -t "should hash"     # filtrar por nombre
npm run test:c                      # con cobertura
```

### 1.3 Estructura

El test vive al lado del código:
```
src/services/auth.ts
src/services/auth.test.ts   ← aquí
```

Para helpers compartidos:
```
src/test-utils/
  http-mocks.ts        # req, res, next falsos
  db-cleanup.ts        # truncate de tablas
  factories.ts         # builders de entidades
  auth-tokens.ts       # tokens JWT para tests E2E
```

---

## 2. Anatomía de un test (lo básico)

Antes de copiar recetas, conviene entender los bloques que componen cualquier
test. Todos los ejemplos siguientes salen de `src/services/auth.test.ts`.

### 2.1 La forma general

```ts
describe('Given <SUT>', () => {
    describe('When <condición>', () => {
        test('Then <resultado esperado>', () => {
            // Arrange
            // Act
            // Assert
        });
    });
});
```

Tres niveles, de fuera a dentro: **agrupar → contexto → caso concreto**. La
salida del runner se lee como una frase: *"Given AuthService, when hash is
used, then returns a valid bcrypt hash"*.

### 2.2 `describe` — agrupador

Sirve para **organizar** tests relacionados. No tiene comportamiento propio:
solo crea un bloque visual y un scope donde declarar variables compartidas.

```ts
describe('Given AuthService', () => {
    const password = '123456';   // ← compartido por todos los tests del grupo

    describe('When hash() is used', () => {
        test('...', () => { /* usa `password` */ });
        test('...', () => { /* usa `password` */ });
    });
});
```

Reglas prácticas:
- Anida cuando ayude a leer (BDD: Given / When / Then). No lo abuses; con
  2-3 niveles ya es suficiente.
- El nombre del `describe` describe **el sujeto bajo test (SUT)** o el
  contexto, NO la acción.

### 2.3 `test` — el caso individual

Cada `test(...)` es **un escenario**. El nombre debe describir el
comportamiento esperado en un lenguaje que cualquiera entienda sin leer el
código.

```ts
// ✅ bien: describe el comportamiento
test('Then hash returns a valid bcrypt hash with cost 12', ...);

// ❌ mal: describe la implementación
test('calls bcrypt.hash with 12 as second argument', ...);
```

`test` y `it` son **alias** — funcionan igual. Usa el que prefieras y sé
consistente. Este proyecto usa `test`.

### 2.4 El patrón AAA (Arrange · Act · Assert)

Cada test sigue tres fases. Separarlas con comentarios o líneas en blanco
hace el test legible de un vistazo.

```ts
test('Then compare resolves true for the right password', async () => {
    // ── Arrange ─── (preparar el escenario)
    const hash = await AuthService.hash(password);

    // ── Act ─── (ejecutar la unidad bajo test)
    const result = await AuthService.compare(password, hash);

    // ── Assert ─── (verificar el resultado)
    expect(result).toBe(true);
});
```

#### Arrange — Preparar
- Crear datos de entrada.
- Construir instancias necesarias.
- Configurar mocks específicos del test.
- Si todo está listo desde el `describe` superior, este bloque puede ser
  vacío — déjalo con un comentario explicando por qué para mantener la
  estructura visible.

#### Act — Ejecutar
- **Una sola línea** (idealmente). Es la llamada a la función/método que
  estás probando.
- Si necesitas más de una llamada, casi siempre estás testeando dos cosas a
  la vez → divide en dos tests.

#### Assert — Verificar
- Una o varias `expect(...)`.
- Cada test debería verificar **un comportamiento**. Múltiples `expect` están
  bien si todas validan el mismo comportamiento desde ángulos distintos
  (formato, contenido, tipo).

### 2.5 `expect(...)` y los matchers más usados

`expect` es la función con la que comparas el valor real contra el
esperado. Se encadena con un *matcher*. Los más útiles:

```ts
// Igualdad
expect(x).toBe(5);                    // === (primitivos / misma referencia)
expect(obj).toEqual({ a: 1 });        // igualdad estructural profunda
expect(obj).toMatchObject({ a: 1 });  // contiene esos campos (ignora extras)

// Tipo / valor
expect(x).toBeTypeOf('string');
expect(x).toBeNull();
expect(x).toBeUndefined();
expect(x).toBeTruthy();
expect(arr).toHaveLength(3);
expect(arr).toContain('admin');

// Strings
expect(s).toMatch(/^\$2[aby]\$/);     // regex
expect(s).toContain('error');         // substring

// Negación
expect(x).not.toBe(5);

// Errores síncronos (envolver en arrow!)
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(NotFoundError);
expect(() => fn()).toThrow(/not found/);

// Promesas
await expect(promesa).resolves.toBe(true);
await expect(promesa).rejects.toThrow();
await expect(promesa).rejects.toMatchObject({ code: 'P2002' });

// Mocks (vi.fn())
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith(1, 'a');
expect(mockFn).toHaveBeenCalledWith(expect.any(NotFoundError));
expect(mockFn).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
```

Regla: **prefiere el matcher más específico que aplique**. `toBe(true)` es
más claro que `toBeTruthy()`. `toMatchObject` es más estable que `toEqual`
cuando esperas campos extra (timestamps, IDs autogenerados, `iat` de JWT).

### 2.6 `async` / `await` — cuándo y por qué

#### Cuándo el test debe ser `async`

Cuando dentro del test **esperas una promesa**. Hay tres formas equivalentes:

```ts
// 1) await directo en el Act — siempre funciona
test('...', async () => {
    const result = await AuthService.hash(password);
    expect(result).toBeTypeOf('string');
});

// 2) await en el expect (.resolves / .rejects) — más compacto
test('...', async () => {
    await expect(AuthService.compare(password, hash)).resolves.toBe(true);
});

// 3) devolver la promesa (funciona pero menos legible)
test('...', () => {
    return AuthService.compare(password, hash).then(r => expect(r).toBe(true));
});
```

#### El error que más vas a cometer

```ts
// ❌ MAL — falta `await`. El test pasa aunque la promesa rechace.
test('...', () => {
    expect(AuthService.compare(p, h)).resolves.toBe(true);
});

// ✅ BIEN
test('...', async () => {
    await expect(AuthService.compare(p, h)).resolves.toBe(true);
});
```

Sin `await`, vitest no sabe que hay una aserción pendiente y termina el
test antes de que la promesa se resuelva. Resultado: tests verdes mentirosos.

#### Para errores asíncronos

```ts
// Síncrono: envolver en arrow
expect(() => AuthService.verifyToken(bad)).toThrow();

// Asíncrono: .rejects + await
await expect(repo.register(dup)).rejects.toMatchObject({ code: 'P2002' });
```

### 2.7 Hooks de setup y teardown

Vitest ofrece 4 hooks. Se ejecutan respecto al `describe` que los contiene:

```ts
describe('UsersRepo', () => {
    beforeAll(async () => {
        // 1 vez antes de TODOS los tests del bloque
        prisma = await connectDB();
    });

    afterAll(async () => {
        // 1 vez al final
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        // antes de CADA test individual
        await cleanDb(prisma);
    });

    afterEach(() => {
        // después de cada test (raro de necesitar)
    });

    test('...', async () => { /* ... */ });
});
```

Reglas prácticas:
- **`beforeAll`**: para cosas caras y reutilizables (conexión DB, arranque
  de app).
- **`beforeEach`**: para garantizar **aislamiento** entre tests (limpiar DB,
  resetear mocks). Sin esto, el orden de ejecución condiciona el resultado.
- Evita estado compartido entre tests vía variables del describe sin
  resetearlas — es la causa #1 de tests frágiles.

### 2.8 Mocks — el mínimo viable

Tres herramientas, en orden de potencia:

#### `vitest.fn()` — función espía
```ts
const next = vitest.fn();
controller.handle(req, res, next);
expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
```

#### `vitest.fn().mockResolvedValue(x)` — devuelve una promesa
```ts
const repo = {
    getUserById: vitest.fn().mockResolvedValue({ id: 1, email: 'a@b.c' }),
};
```

Variantes: `mockReturnValue`, `mockRejectedValue`, `mockImplementation(fn)`.

#### `vitest.mock(path, factory)` — sustituye un módulo entero
```ts
vitest.mock('../config/env.ts', () => ({
    env: { JWT_SECRET: 'x'.repeat(32), PROJECT_NAME: 'test' },
}));
```

Lo más fuerte. Reemplaza TODO el módulo. Vitest **hoistea** estas llamadas
al inicio del fichero (corre antes que los `import`), así que no importa
dónde las pongas físicamente.

#### `vitest.spyOn(obj, 'method')` — espía sin reemplazar
```ts
const exitSpy = vitest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
// ... ejecutar código que llamaría process.exit
expect(exitSpy).toHaveBeenCalledWith(1);
exitSpy.mockRestore();
```

Útil cuando quieres observar Y dejar que se siga ejecutando algo real.

### 2.9 Checklist mental antes de escribir un test

1. ¿Qué es el **SUT**? (la unidad concreta que estoy probando)
2. ¿Qué **comportamiento** quiero verificar? (uno por test)
3. ¿Qué necesito **preparar** (Arrange)? ¿Qué mocks necesito?
4. ¿Cuál es la **única** llamada del Act?
5. ¿Cuál es la aserción específica que prueba el comportamiento?
6. Si el test fallara, ¿el nombre me diría qué se rompió sin abrir el fichero?

Si los 6 puntos están claros, escribir el test es mecánico.

---

## 3. Las 5 recetas que vas a usar siempre

### Receta A — Mockear `env.ts`

Cualquier fichero que importe `env` (directa o transitivamente) necesita esto
al inicio:

```ts
vitest.mock('../config/env.ts', () => ({
    env: {
        JWT_SECRET: 'test_secret_long_enough_for_jwt_signing',
        PROJECT_NAME: 'test',
        // añade más vars si el SUT las usa
    },
}));
```

**Por qué**: `env.ts` real llama a `process.exit(1)` si faltan variables.
Mockearlo evita ese suicidio en los tests.

### Receta B — Dobles de `req`, `res`, `next`

Crea `src/test-utils/http-mocks.ts`:

```ts
import type { Request, Response, NextFunction } from 'express';

export const mockReq = (overrides: Partial<Request> = {}) => ({
    body: {},
    params: {},
    headers: {},
    header: vitest.fn((name: string) => (overrides.headers as any)?.[name]),
    ...overrides,
}) as unknown as Request;

export const mockRes = () => {
    const res = {} as Response;
    res.status = vitest.fn().mockReturnValue(res);
    res.json = vitest.fn().mockReturnValue(res);
    res.send = vitest.fn().mockReturnValue(res);
    res.end = vitest.fn().mockReturnValue(res);
    return res;
};
```

**Uso**:
```ts
const req = mockReq({ params: { id: '1' } });
const res = mockRes();
const next = vitest.fn();

await controller.getUserById(req, res, next);

expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
```

### Receta C — Supertest para E2E

```ts
import request from 'supertest';
import { createApp } from '../src/app.ts';
import { connectDB } from '../src/config/db-config.ts';

let app, prisma;

beforeAll(async () => {
    prisma = await connectDB();
    app = createApp(prisma);
});

afterAll(async () => {
    await prisma.$disconnect();
});

test('GET /health → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
});
```

⚠️ No llames a `.listen()` — supertest abre puerto efímero por sí mismo.

### Receta D — Limpieza de BBDD entre tests

`src/test-utils/db-cleanup.ts`:

```ts
import type { AppPrismaClient } from '../config/db-config.ts';

export const cleanDb = async (prisma: AppPrismaClient) => {
    // Orden: hijos antes que padres por las FKs
    await prisma.review.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.film.deleteMany();
    await prisma.genre.deleteMany();
};
```

**Uso**:
```ts
beforeEach(async () => {
    await cleanDb(prisma);
});
```

### Receta E — Factories de datos

`src/test-utils/factories.ts`:

```ts
let counter = 0;

export const userInput = (overrides = {}) => ({
    email: `user${++counter}@test.com`,
    password: 'password123',
    profile: {
        firstName: 'Test',
        surname: 'User',
        avatar: 'avatar.png',
    },
    ...overrides,
});

export const filmInput = (overrides = {}) => ({
    title: `Film ${++counter}`,
    year: 2024,
    director: 'Anonymous',
    duration: 120,
    rate: 5.0,
    ...overrides,
});
```

**Uso**:
```ts
const user1 = await prisma.user.create({ data: userInput() });
const user2 = await prisma.user.create({ data: userInput({ role: 'ADMIN' }) });
```

---

## 4. Cómo testear cada tipo de fichero

### 4.1 Servicios puros — `src/services/auth.ts`

✅ **Ya hecho** en `src/services/auth.test.ts`. Patrón: mock de `env`, todo
lo demás real, round-trip cuando sea posible (`hash → compare`,
`sign → verify`).

---

### 4.2 Clases de error — `src/errors/http-error.ts`

**Patrón**: instanciar y verificar propiedades.

```ts
import { NotFoundError, UnauthorizedError } from './http-error.ts';

describe('HttpError subclasses', () => {
    test('NotFoundError sets status 404', () => {
        const err = new NotFoundError('User not found');
        expect(err.status).toBe(404);
        expect(err.message).toBe('User not found');
    });

    test('Cause propagates', () => {
        const root = new Error('db down');
        const err = new NotFoundError('msg', { cause: root });
        expect(err.cause).toBe(root);
    });
});
```

**Qué cubrir**: una test por subclase (NotFound 404, Unauthorized 401,
Forbidden 403, BadRequest 400, InternalServer 500) + un test para `cause`.

---

### 4.3 Middleware — `src/middleware/auth.interceptor.ts`

**Patrón**: instanciar, llamar al método, verificar `next` y/o `req.user`.

```ts
vitest.mock('../config/env.ts', () => ({
    env: { JWT_SECRET: 'test_secret_long_enough_xxxxxxxxx', PROJECT_NAME: 'test' },
}));

import { AuthInterceptor } from './auth.interceptor.ts';
import { AuthService } from '../services/auth.ts';
import { UnauthorizedError } from '../errors/http-error.ts';
import { mockReq, mockRes } from '../test-utils/http-mocks.ts';

describe('AuthInterceptor.authenticate', () => {
    const interceptor = new AuthInterceptor();

    test('without Authorization header → next(UnauthorizedError)', () => {
        const req = mockReq();
        const next = vitest.fn();

        interceptor.authenticate(req, mockRes(), next);

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    test('with valid token → sets req.user and calls next()', () => {
        const token = AuthService.generateToken({ id: 1, email: 'a@b.c', role: 'USER' });
        const req = mockReq({ headers: { Authorization: `Bearer ${token}` } });
        const next = vitest.fn();

        interceptor.authenticate(req, mockRes(), next);

        expect(req.user).toMatchObject({ id: 1, email: 'a@b.c' });
        expect(next).toHaveBeenCalledWith(); // sin argumentos = OK
    });
});
```

**Qué cubrir** en `AuthInterceptor`:
- `authenticate`: sin header / header malformado / token inválido / token válido.
- `authorize(roles)`: sin user / rol no permitido / ADMIN bypass / rol permitido.
- `isOwnerOrAdmin`: sin user / no es dueño ni admin / es admin / es dueño.

#### `error-handler.ts`

```ts
import { errorHandler } from './error-handler.ts';
import { NotFoundError } from '../errors/http-error.ts';
import { ZodError } from 'zod';
import { mockReq, mockRes } from '../test-utils/http-mocks.ts';

test('HttpError → sets status and sends message', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('not here'), mockReq(), res, vitest.fn());
    expect(res.statusCode).toBe(404);
    expect(res.send).toHaveBeenCalledWith('not here');
});

test('ZodError → 400 with issues as JSON', () => {
    const zErr = new ZodError([{ code: 'custom', message: 'bad', path: ['x'] }] as any);
    const res = mockRes();
    errorHandler(zErr, mockReq(), res, vitest.fn());
    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalled();
});
```

**Qué cubrir**: HttpError, ZodError, PrismaClientKnownRequestError, Error
genérico, valor no-Error.

---

### 4.4 Repositorios — `src/users/repos/users.repo.ts`

**Patrón**: BBDD de test real, limpiar antes de cada test, Prisma real.

```ts
import { connectDB, type AppPrismaClient } from '../../config/db-config.ts';
import { UsersRepo } from './users.repo.ts';
import { cleanDb } from '../../test-utils/db-cleanup.ts';
import { userInput } from '../../test-utils/factories.ts';
import { AuthService } from '../../services/auth.ts';

let prisma: AppPrismaClient;
let repo: UsersRepo;

beforeAll(async () => {
    prisma = await connectDB();
    repo = new UsersRepo(prisma);
});

beforeEach(async () => {
    await cleanDb(prisma);
});

afterAll(async () => {
    await prisma.$disconnect();
});

describe('UsersRepo.register', () => {
    test('creates user with profile and hashes password', async () => {
        const input = userInput();

        const created = await repo.register(input);

        expect(created.email).toBe(input.email);
        expect(created.profile?.firstName).toBe(input.profile.firstName);

        // verificar que la password fue hasheada (no guardada en plano)
        const stored = await prisma.user.findUnique({
            where: { id: created.id },
            omit: { password: false },
        });
        expect(stored?.password).not.toBe(input.password);
        expect(await AuthService.compare(input.password, stored!.password)).toBe(true);
    });

    test('duplicate email throws P2002', async () => {
        const input = userInput({ email: 'dup@test.com' });
        await repo.register(input);

        await expect(repo.register(input)).rejects.toMatchObject({ code: 'P2002' });
    });
});
```

**Qué cubrir** por método del repo:
- Happy path con datos válidos (verificar la entidad creada/actualizada en
  DB, no solo el return).
- Not found → `P2025`.
- Conflictos de unicidad → `P2002`.
- Cascadas (borrar User borra Profile, etc.).

**No mockear Prisma**. Los mocks "aceptan" cualquier query y dan falsa
confianza.

---

### 4.5 Controllers — `src/users/controllers/users.controller.ts`

**Patrón**: mockear el repo, llamar al método del controller, verificar
`res.status`/`res.json` o `next(error)`.

```ts
vitest.mock('../../config/env.ts', () => ({
    env: { PROJECT_NAME: 'test', JWT_SECRET: 'x'.repeat(32) },
}));

import { UsersController } from './users.controller.ts';
import { mockReq, mockRes } from '../../test-utils/http-mocks.ts';
import { NotFoundError } from '../../errors/http-error.ts';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

describe('UsersController.getUserById', () => {
    test('happy path → 200 + user JSON', async () => {
        const repo = { getUserById: vitest.fn().mockResolvedValue({ id: 1, email: 'a@b.c' }) };
        const controller = new UsersController(repo as any);
        const req = mockReq({ params: { id: '1' } });
        const res = mockRes();
        const next = vitest.fn();

        await controller.getUserById(req, res, next);

        expect(repo.getUserById).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        expect(next).not.toHaveBeenCalled();
    });

    test('repo throws P2025 → next(NotFoundError)', async () => {
        const prismaErr = new PrismaClientKnownRequestError('not found', {
            code: 'P2025', clientVersion: '',
        });
        const repo = { getUserById: vitest.fn().mockRejectedValue(prismaErr) };
        const controller = new UsersController(repo as any);
        const next = vitest.fn();

        await controller.getUserById(mockReq({ params: { id: '99' } }), mockRes(), next);

        expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
});
```

**Qué cubrir** por cada método del controller:
- Llamar al repo con los argumentos correctos.
- Status code y body en éxito.
- Error de Prisma `P2025` → `NotFoundError` vía `next`.
- Login específico: cualquier `PrismaClientKnownRequestError` → `UnauthorizedError`.
- Error genérico → `InternalServerError`.

**No probar el contenido del JSON al detalle**. Eso ya lo cubre el repo.

---

### 4.6 E2E (toda la pila) — `/api/users`

**Patrón**: `supertest(app)` con BBDD real, sembrando lo necesario.

```ts
import request from 'supertest';
import { createApp } from '../app.ts';
import { connectDB, type AppPrismaClient } from '../config/db-config.ts';
import { cleanDb } from '../test-utils/db-cleanup.ts';
import { userInput } from '../test-utils/factories.ts';

let app: any;
let prisma: AppPrismaClient;

beforeAll(async () => {
    prisma = await connectDB();
    app = createApp(prisma);
});

beforeEach(async () => {
    await cleanDb(prisma);
});

afterAll(async () => {
    await prisma.$disconnect();
});

describe('POST /api/users/register', () => {
    test('valid body → 201 + user created', async () => {
        const body = userInput();

        const res = await request(app).post('/api/users/register').send(body);

        expect(res.status).toBe(201);
        expect(res.body.email).toBe(body.email);

        const inDb = await prisma.user.findUnique({ where: { email: body.email } });
        expect(inDb).not.toBeNull();
    });

    test('invalid email → 400', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send({ ...userInput(), email: 'not-an-email' });

        expect(res.status).toBe(400);
    });
});

describe('POST /api/users/login', () => {
    test('correct credentials → 200 + token', async () => {
        const body = userInput();
        await request(app).post('/api/users/register').send(body);

        const res = await request(app)
            .post('/api/users/login')
            .send({ email: body.email, password: body.password });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeTypeOf('string');
    });

    test('wrong password → 401', async () => {
        const body = userInput();
        await request(app).post('/api/users/register').send(body);

        const res = await request(app)
            .post('/api/users/login')
            .send({ email: body.email, password: 'wrong' });

        expect(res.status).toBe(401);
    });
});
```

**Helper para tests con auth** — `src/test-utils/auth-tokens.ts`:

```ts
export const registerAndLogin = async (
    app: any,
    prisma: AppPrismaClient,
    role: 'USER' | 'ADMIN' = 'USER',
) => {
    const body = userInput();
    await request(app).post('/api/users/register').send(body);
    if (role === 'ADMIN') {
        await prisma.user.update({
            where: { email: body.email }, data: { role: 'ADMIN' },
        });
    }
    const login = await request(app).post('/api/users/login').send({
        email: body.email, password: body.password,
    });
    return { token: login.body.token, user: login.body.credentials };
};
```

**Uso en tests protegidos**:
```ts
test('GET /api/users requires auth', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
});

test('GET /api/users with admin token → 200', async () => {
    const { token } = await registerAndLogin(app, prisma, 'ADMIN');
    const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
});
```

**Qué cubrir** por cada endpoint:
- 200/201/204 felices.
- 400 con body inválido (cubre middleware de zod).
- 401 sin token / token inválido.
- 403 si el rol no basta (`isOwnerOrAdmin`, `authorize`).
- 404 con id inexistente.
- 409/500 en duplicados según diseño.

---

### 4.7 `app.ts` — smoke E2E

```ts
test('GET /health → 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
});

test('GET / → HTML', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<'); // tiene HTML
});

test('unknown route → 404', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
});
```

---

### 4.8 Lo que NO se testa

| Fichero | Por qué no |
|---|---|
| `src/index.ts` | Bootstrap top-level. Cubierto por E2E + `server.ts`. |
| `src/server.ts` | Solo cablea. Smoke test opcional. |
| Routers (`*.router.ts`) | Cubierto transitivamente por los E2E. |
| `views/home.ts` | Bajo valor; opcional. |

---

## 5. Orden recomendado de implementación

Seguir este orden te da red de seguridad antes de cada paso:

1. **`src/test-utils/`** ← Recetas B, D, E. Sin esto los siguientes son verbosos.
2. **`src/errors/`** ← clases puras, calienta el grupo (~10 min).
3. **`src/middleware/error-handler.ts`** ← lo usan todos los E2E.
4. **`src/middleware/auth.interceptor.ts`** ← idem.
5. **Resto de middleware**: `validations`, `custom-headers`, `invalid-handler`.
6. **`src/users/repos/users.repo.ts`** ← el más rico (auth, hashing, relaciones).
7. **Resto de repos**: films, genres, reviews.
8. **Controllers**: users → resto.
9. **`src/app.ts`** smoke.
10. **E2E `/api/users`** completo.
11. **E2E `/api/films`, `/genres`, `/reviews`**.
12. **(Opcional)** env, server, views.

---

## 6. Trampas comunes

- **Olvidar `await`** en `expect(promesa).resolves.toBe(...)` — la
  aserción pasaría aunque la promesa rechace.
- **Mockear Prisma en repos** — falsa confianza, el mock acepta queries que
  Postgres rechazaría.
- **Tests E2E sin limpiar DB** — el orden de ejecución condiciona el
  resultado, los tests se vuelven frágiles.
- **`expect(fn()).toThrow()`** sin envolver en arrow — el error sale fuera
  del expect y rompe el test. Correcto: `expect(() => fn()).toThrow()`.
- **Asertar contenido exacto de JSON** — frágil. Usa `expect.objectContaining(...)`.
- **Tests dependientes** — cada test debe poder correr aislado y en
  cualquier orden. Si un test depende de que otro creó algo, está mal
  escrito.

---

## 7. Glosario rápido

- **SUT**: Subject Under Test — la unidad que estás probando.
- **AAA**: Arrange · Act · Assert — estructura de cada test.
- **Doble**: sustituto de un colaborador (mock, stub, spy, fake). En vitest,
  `vi.fn()` cubre la mayoría.
- **Round-trip**: probar dos operaciones inversas juntas (sign↔verify,
  hash↔compare). Valida comportamiento sin mockear.
- **Happy / Sad path**: input válido / camino erróneo.
