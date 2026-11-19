/** Error devuelto por la API de Mercado Público o por la capa HTTP. */
export class MercadoPublicoError extends Error {
  /** Código interno de la API (p. ej. 203 ticket inválido, 10500 peticiones simultáneas) o estado HTTP. */
  readonly codigo: number | undefined;
  readonly status: number | undefined;
  /** Indica si tiene sentido reintentar la petición. */
  readonly reintentable: boolean;

  constructor(
    mensaje: string,
    opts: { codigo?: number; status?: number; reintentable?: boolean; cause?: unknown } = {},
  ) {
    super(mensaje, { cause: opts.cause });
    this.name = 'MercadoPublicoError';
    this.codigo = opts.codigo;
    this.status = opts.status;
    this.reintentable = opts.reintentable ?? false;
  }
}

/** Se lanza cuando se alcanza el límite diario configurado, antes de llamar a la API. */
export class CuotaAgotadaError extends MercadoPublicoError {
  constructor(limite: number) {
    super(`Se alcanzó el límite diario de ${limite} peticiones a la API de Mercado Público.`, {
      status: 429,
    });
    this.name = 'CuotaAgotadaError';
  }
}

/**
 * Detecta si un mensaje de la API indica un problema transitorio.
 * La API no documenta códigos de error, así que se combina código y texto.
 */
export function esErrorTransitorio(codigo: number | undefined, mensaje: string): boolean {
  const m = mensaje.toLowerCase();
  return (
    codigo === 10500 ||
    m.includes('simult') ||
    m.includes('intente nuevamente') ||
    m.includes('timeout') ||
    m.includes('tiempo de espera')
  );
}
