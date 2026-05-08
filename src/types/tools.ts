// Herramientas para comprobar la Compatibilidad de tipos entre Zod y Prisma
export type CompatibleWith<Actual extends Expected, Expected> = Actual;
export type Exact<A, B> = A extends B ? (B extends A ? A : never) : never;
// comprueba que Actual sea asignable a Expected
// no comprueba igualdad exacta
// no comprueba que Expected no tenga campos extra opcionales
// no comprueba que ambos tengan la misma intención semántica

export type Assert<T extends true> = T;
// con IsExact, comprueba que A y B sean exactamente iguales
// no permite campos extra, ni opcionales, ni diferencias en tipos de campos

export type IsExact<A, B> = [A] extends [B]
    ? [B] extends [A]
        ? [Exclude<keyof A, keyof B>, Exclude<keyof B, keyof A>] extends [
              never,
              never,
          ]
            ? true
            : false
        : false
    : false;
