import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extrae el id_taller del JWT del usuario autenticado.
 * REGLA: Este decorator es la única fuente válida de id_taller en los handlers.
 * Nunca leer id_taller desde el body, query string, o params de ruta.
 */
export const CurrentTaller = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.idTaller;
  },
);
