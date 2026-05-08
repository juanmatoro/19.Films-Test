/* =============================================================================
 * CASO DE ESTUDIO: tests unitarios de AuthService
 * -----------------------------------------------------------------------------
 * Este archivo es deliberadamente educativo. Documenta:
 *
 *   1. Por qué mockeamos `env` y NO mockeamos `bcryptjs` / `jsonwebtoken`.
 *   2. Estructura BDD con `describe`/`test` (Given / When / Then).
 *   3. Patrón AAA dentro de cada test (Arrange · Act · Assert).
 *   4. Aserciones de Vitest que conviene conocer (toBeTypeOf, toMatchObject,
 *      resolves.toBe, toThrow, etc.).
 *
 * Vitest está configurado con `globals: true` (vitest.config.js), por eso
 * `describe`, `test`, `expect`, `vitest.mock`, etc. existen sin import explícito.
 * En proyectos sin globals usarías `import { describe, test, expect, vi } from 'vitest'`.
 * ========================================================================== */

import { AuthService } from './auth.ts';
import type { TokenPayload } from '../types/login.ts';

/* -----------------------------------------------------------------------------
 * MOCK DE `env`
 * -----------------------------------------------------------------------------
 * `auth.ts` importa `env` desde '../config/env.ts'. Si NO mockeamos ese módulo,
 * al cargar AuthService se ejecuta el cuerpo de env.ts, que parsea
 * `process.env` con Zod y llama a `process.exit(1)` si faltan variables.
 *
 * En el entorno de test esas variables podrían no estar definidas (o ser
 * distintas), por lo que mockear es la única vía limpia para aislar la unidad.
 *
 * `vitest.mock(path, factory)` se HOISTEA al inicio del archivo (antes de los
 * imports), así que aunque visualmente esté después del `import AuthService`,
 * en runtime corre antes. Por eso podemos definir `JWT_SECRET` aquí y confiar
 * en que `auth.ts` lo verá al cargarse.
 *
 * El JWT_SECRET aquí solo necesita existir; su valor no importa para el test
 * (no comparamos firmas externamente, hacemos round-trip sign↔verify).
 * -------------------------------------------------------------------------- */
vitest.mock('../config/env.ts', () => ({
    env: {
        JWT_SECRET: 'test_secret_long_enough_for_jwt_signing_32+',
        PROJECT_NAME: 'test_project',
    },
}));

/* -----------------------------------------------------------------------------
 * QUÉ NO MOCKEAMOS Y POR QUÉ
 * -----------------------------------------------------------------------------
 * - `bcryptjs`: función pura y determinista (hash/compare). Mockearla
 *   convierte el test en "AuthService llama a bcrypt", lo cual valida
 *   implementación, no comportamiento. Preferimos round-trip real:
 *   hash(p) → compare(p, hash) === true.
 *
 * - `jsonwebtoken`: idem. Hacemos sign(payload) → verify(token) y
 *   comprobamos que el payload sale igual al que entró.
 *
 * Coste: bcrypt con saltRounds=12 añade ~200ms por hash. Para 6 tests es
 * asumible. Si la suite crece y duele, mockear bcrypt es la primera
 * optimización (ver al final del archivo).
 * -------------------------------------------------------------------------- */

describe('Given AuthService', () => {
    /* `describe` agrupa tests relacionados y permite anidar contextos.
     * El estilo BDD ("Given… When… Then…") hace que la salida del runner
     * se lea como una especificación del comportamiento. */

    /* Datos compartidos por todos los tests del bloque. Como AuthService es
     * stateless (todos los métodos son `static`), no hace falta `beforeEach`
     * para reconstruir nada — basta con declarar las constantes aquí. */
    const password = '123456';
    const payload: TokenPayload = { id: 1, email: 'a@b.c', role: 'USER' };

    describe('When hash() and compare() are used', () => {
        test('Then hash returns a non-empty string', async () => {
            // ── Arrange ────────────────────────────────────────────────
            // No hay setup adicional; `password` viene del scope superior.
            // Se incluye el bloque vacío para mantener la estructura AAA
            // visible en todos los tests por consistencia.

            // ── Act ────────────────────────────────────────────────────
            // Ejecutamos la unidad bajo test. Una sola llamada por test.
            const hash = await AuthService.hash(password);

            // ── Assert ─────────────────────────────────────────────────
            // `toBeTypeOf` valida el tipo runtime via `typeof`. Útil cuando
            // el contrato es solo "es un string", sin importar el contenido.
            expect(hash).toBeTypeOf('string');
            // El hash de bcrypt empieza por "$2a$..." — no afirmamos eso
            // exacto para no acoplarnos al algoritmo concreto, pero sí que
            // tenga longitud > 0.
            expect(hash.length).toBeGreaterThan(0);
        });

        test('Then compare resolves true for the right password', async () => {
            // ── Arrange ────────────────────────────────────────────────
            // Generamos un hash real contra el que vamos a comparar.
            const hash = await AuthService.hash(password);

            // ── Act + Assert ───────────────────────────────────────────
            // `expect(promise).resolves.toBe(value)` espera la promesa y
            // valida el valor resuelto. Equivalente a:
            //     const ok = await AuthService.compare(password, hash);
            //     expect(ok).toBe(true);
            // Pero más conciso. ⚠️ El `await` en el `expect(...).resolves`
            // es OBLIGATORIO; sin él, una promesa rechazada pasaría como ok.
            await expect(AuthService.compare(password, hash)).resolves.toBe(true);
        });

        test('Then compare resolves false for a wrong password', async () => {
            // ── Arrange ────────────────────────────────────────────────
            // Hash de la password correcta; vamos a comparar contra otra.
            const hash = await AuthService.hash(password);

            // ── Act + Assert ───────────────────────────────────────────
            // "Happy path negativo": una password incorrecta debe dar
            // `false`, no lanzar. bcrypt distingue rechazo (mismatch) de
            // error (hash corrupto) → aquí solo testeamos mismatch.
            await expect(AuthService.compare('wrong', hash)).resolves.toBe(false);
        });
    });

    describe('When generateToken() and verifyToken() are used', () => {
        test('Then generateToken returns a JWT string (3 segments)', () => {
            // ── Arrange ────────────────────────────────────────────────
            // `payload` ya está definido en el scope superior.

            // ── Act ────────────────────────────────────────────────────
            const token = AuthService.generateToken(payload);

            // ── Assert ─────────────────────────────────────────────────
            // Un JWT siempre tiene 3 partes separadas por punto:
            //   header.payload.signature
            // Validar el split es una aserción estructural barata que detecta
            // errores groseros (p.ej. devolver el payload sin firmar) sin
            // entrar a inspeccionar las firmas.
            expect(token).toBeTypeOf('string');
            expect(token.split('.')).toHaveLength(3);
        });

        test('Then verifyToken returns the original payload', () => {
            // ── Arrange ────────────────────────────────────────────────
            // Necesitamos un token válido firmado con el mismo secret que
            // usará verify (el mock de env garantiza la consistencia).
            const token = AuthService.generateToken(payload);

            // ── Act ────────────────────────────────────────────────────
            const decoded = AuthService.verifyToken(token);

            // ── Assert ─────────────────────────────────────────────────
            // `toMatchObject` es la clave aquí: compara que el objeto
            // recibido CONTIENE las propiedades del esperado, ignorando
            // extras. Y jwt añade campos automáticos (`iat`, y `exp` si
            // configuras expiración). Si usáramos `toEqual`, fallaría
            // porque `decoded` incluye `iat`. `toMatchObject` lo tolera.
            expect(decoded).toMatchObject(payload);
        });

        test('Then verifyToken throws on a tampered token', () => {
            // ── Arrange ────────────────────────────────────────────────
            // Tomamos un token válido y lo corrompemos añadiendo un char
            // al final → la firma deja de coincidir.
            const tamperedToken = AuthService.generateToken(payload) + 'x';

            // ── Act + Assert ───────────────────────────────────────────
            // Para aserciones sobre funciones síncronas que LANZAN, hay
            // que envolver la llamada en un arrow:
            //   expect(() => fn()).toThrow();
            // Si llamáramos `AuthService.verifyToken(tamperedToken)`
            // directamente, el throw ocurriría ANTES de que expect lo
            // reciba, y el test fallaría con el error sin capturar.
            expect(() => AuthService.verifyToken(tamperedToken)).toThrow();

            // Variantes útiles que también valen aquí:
            //   .toThrow(JsonWebTokenError)     // por clase
            //   .toThrow('invalid signature')   // por substring del msg
            //   .toThrow(/signature/)           // por regex
        });
    });
});

/* =============================================================================
 * ALTERNATIVA: mockear bcrypt si la suite se vuelve lenta
 * -----------------------------------------------------------------------------
 * Coste/beneficio: ganas velocidad (de ~200ms a ~0ms por hash) pero pierdes
 * la garantía de que hash/compare cooperan. Solo merece la pena cuando la
 * lentitud duele de verdad.
 *
 *   vitest.mock('bcryptjs', () => ({
 *       hash:    vitest.fn(async (p: string) => `hashed_${p}`),
 *       compare: vitest.fn(async (p: string, h: string) => h === `hashed_${p}`),
 *   }));
 *
 * Lo mismo aplica a `jsonwebtoken`: solo mockear cuando un test concreto
 * NECESITA forzar un comportamiento (p.ej. simular `verify` lanzando
 * TokenExpiredError sin esperar la expiración real).
 * ========================================================================== */
