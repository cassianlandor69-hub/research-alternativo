# Agency Atlas

Un panel de exploración totalmente estático del mercado agencial español, construido con Astro a partir de `agencies.db`.

![Panel de Agency Atlas](docs/preview.png)

Todos los registros —170 agencias, 291 personas, 122 marcas cliente y 154 noticias de prensa sectorial— se resuelven e incrustan en la compilación. No hay servidor, conexión a base de datos ni API en cliente: la búsqueda, los filtros, el orden y la paleta ⌘K funcionan sobre HTML y JSON estáticos.

## Inicio rápido

```bash
pnpm install
pnpm dev       # exporta el dataset y arranca Astro en http://localhost:4321
pnpm build     # exporta el dataset y genera el sitio estático en dist/
pnpm preview   # sirve la compilación de producción
```

Requiere Node 22+ (el script de exportación usa el controlador integrado `node:sqlite`).

## Páginas

| Ruta | Qué es |
| --- | --- |
| `/` | Panel de resumen: composición, propiedad, geografía, pulso de cobertura, fuentes y completitud de datos |
| `/agencias/` | Directorio de agencias con búsqueda, filtros y tabla ordenable |
| `/agencias/[slug]/` | 170 fichas: liderazgo, clientes, cobertura, procedencia y confianza |
| `/personas/` | Directorio de personas con filtros de fundadores y directores |
| `/clientes/` | Cartera de clientes y las agencias detrás de cada marca |
| `/noticias/` | Actualidad con filtros de tema, medio y búsqueda |
| `/datos/` | Explorador de esquema, relaciones, completitud de campos, advertencias y registro de ingesta |
| `/dataset.json` | Dataset completo ya unido (generado) |
| `/agencies.db` | Base de datos SQLite original (copiada en la compilación) |
| `/search.json` | Índice compacto para la paleta ⌘K (generado) |

## Flujo de datos

`scripts/export-data.mjs` es la única fuente de verdad de la compilación del sitio:

1. Abre `agencies.db` en solo lectura mediante `node:sqlite`.
2. Resuelve todas las relaciones (personas, clientes y noticias), normaliza la propiedad en seis redes, limpia resúmenes malformados de origen y deduplica las noticias destacadas casi idénticas.
3. Escribe `src/data/dataset.json` para Astro, además de `public/dataset.json`, `public/search.json` y una copia de la base de datos.
4. Astro renderiza todas las rutas de forma estática, incluida una página por agencia.

Puedes ejecutarlo por separado con `pnpm export:data`.

## Notas de diseño

- Panel editorial oscuro y de alto contraste con Geist / Instrument Serif, gráficos SVG propios y sin librería de gráficos.
- Responsive desde 390 px; las tablas se convierten en tarjetas y los filtros pasan a un carril con desplazamiento horizontal.
- Mejora progresiva: todos los registros del directorio se renderizan en el servidor y son visibles sin JavaScript; los filtros, el orden, la paleta de comandos y los tooltips mejoran la página.
- Accesibilidad: enlace de salto, landmarks, foco visible y soporte de movimiento reducido. `pnpm test:a11y` ejecuta axe-core en todas las rutas clave (0 violaciones).

## Scripts de QA

Ambos esperan el servidor de desarrollo en `http://127.0.0.1:4321` (el puerto por defecto de `pnpm dev`) y una instalación local de Chrome:

```bash
pnpm dev
# en otra terminal
pnpm test:ui     # 32 comprobaciones de interacción y maquetación
pnpm test:a11y   # auditoría axe WCAG 2.1 A/AA de todas las plantillas
```

Usa `BASE_URL` para apuntarlos a otro puerto o a una vista previa de producción.

## Advertencias

El catálogo de origen es editorial, no auditado. El estado es `active` en todos los registros, la confianza es constante (`0.5`), los sectores de cliente y el sentimiento de las noticias están vacíos, y los campos de empleados e ingresos son casi inexistentes. `/datos/` documenta estas carencias de forma explícita.
