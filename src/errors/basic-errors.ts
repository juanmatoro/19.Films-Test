import { HttpError } from "./http-error.ts";

// Finalmente no se usan 
// al haber creado clases específicas para los principales errores HTTP, 
// pero se dejan aquí como ejemplo de creación de errores personalizados
// a partir de la clase base HttpError

export const INTERNAL_ERROR = new HttpError(
    500,
    'Internal Server Error',
    'An unexpected error occurred while processing the request',
);

export const NOT_FOUND_ERROR = new HttpError(
    404,
    'Not Found',
    'The requested resource was not found',
);
