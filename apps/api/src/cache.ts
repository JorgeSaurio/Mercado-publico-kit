interface Entrada<T> {
  valor: T;
  expira: number;
  creado: number;
}

/**
 * Caché en memoria con TTL, límite de entradas (expulsa la más antigua) y
 * deduplicación de peticiones en vuelo: si 50 usuarios piden lo mismo a la vez,
 * solo se hace UNA llamada a Mercado Público.
 *
 * Para varias instancias del backend, reemplázala por Redis con la misma interfaz.
 */
export class CacheTTL {
  private datos = new Map<string, Entrada<unknown>>();
  private enVuelo = new Map<string, Promise<unknown>>();
  private aciertos = 0;
  private fallos = 0;

  constructor(private readonly maxEntradas = 500) {}

  async obtener<T>(
    clave: string,
    ttlMs: number,
    cargar: () => Promise<T>,
  ): Promise<{ valor: T; desdeCache: boolean; actualizado: Date }> {
    const e = this.datos.get(clave);
    if (e && e.expira > Date.now()) {
      this.aciertos++;
      // reordenar para que funcione como LRU
      this.datos.delete(clave);
      this.datos.set(clave, e);
      return { valor: e.valor as T, desdeCache: true, actualizado: new Date(e.creado) };
    }

    const pendiente = this.enVuelo.get(clave) as Promise<T> | undefined;
    if (pendiente) {
      this.aciertos++;
      const valor = await pendiente;
      return { valor, desdeCache: true, actualizado: new Date() };
    }

    this.fallos++;
    const p = cargar();
    this.enVuelo.set(clave, p);
    try {
      const valor = await p;
      const ahora = Date.now();
      this.datos.set(clave, { valor, expira: ahora + ttlMs, creado: ahora });
      while (this.datos.size > this.maxEntradas) {
        const primera = this.datos.keys().next().value;
        if (primera === undefined) break;
        this.datos.delete(primera);
      }
      return { valor, desdeCache: false, actualizado: new Date(ahora) };
    } finally {
      this.enVuelo.delete(clave);
    }
  }

  limpiar() {
    this.datos.clear();
  }

  estadisticas() {
    const total = this.aciertos + this.fallos;
    return {
      entradas: this.datos.size,
      aciertos: this.aciertos,
      fallos: this.fallos,
      tasaAcierto: total ? Math.round((this.aciertos / total) * 1000) / 10 : 0,
    };
  }
}
