# CLAUDE.md — Budgetcito / Mis Gastos

Guía para trabajar en este proyecto con Claude Code.

## Stack

- **HTML/CSS/JS vanilla** — sin frameworks, sin TypeScript, sin bundler
- **Chart.js 4.4** (CDN) — gráficos de torta y barras
- **PWA** — Service Worker (`sw.js`) + `manifest.json` para instalación offline
- **Persistencia**: `localStorage` exclusivamente (100% offline, sin backend)

## Cómo correr localmente

El Service Worker requiere un servidor HTTP (no funciona con `file://`):

```bash
python -m http.server 8080
# o
npx serve .
```

En producción necesita HTTPS para que el SW se registre. En localhost funciona con HTTP.

## Arquitectura

```
app.js
├── Repository       — acceso a localStorage (getMonth, saveMonth, getSettings…)
├── State            — estado global de la app (currentYear, currentMonth, monthData, chart…)
├── createMonthData  — factory: crea estructura de mes, arrastrando fijos del mes previo
├── computeTotals    — calcula totals, available, porcentajes
├── renderAll()      — re-renderiza todo (llamar después de cualquier cambio)
├── wireEvents()     — conecta todos los event listeners (se llama una sola vez en init)
└── init()           — bootstrap: carga settings, conecta eventos, renderiza
```

### Modelo de datos en localStorage

Clave: `mg_month_YYYY-MM`, valor: JSON con esta forma:

```json
{
  "monthKey": "2025-06",
  "salary": 1200000,
  "fixed":    [{ "id": "alquiler", "name": "Alquiler", "icon": "🏠", "color": "#7c6af7", "amount": 300000, "active": true }],
  "variable": [{ "id": "var_...", "name": "Nafta",     "icon": "⛽", "color": "#f87171", "amount": 50000,  "active": true }]
}
```

- `fixed`: se copian del mes anterior al navegar a un mes nuevo (carry-forward de monto)
- `variable`: siempre arrancan vacíos en meses nuevos
- `active`: controla si el gasto se suma al total de ese mes

Settings globales: clave `mg_settings` → `{ "salaryHidden": false }`

## Convenciones del proyecto

- **No introducir dependencias nuevas** — si necesitás algo, implementalo vanilla
- **No agregar TypeScript ni bundler** — el código se despliega tal cual
- **No hay test suite** — verificar manualmente en el browser
- **Nombres en español** para UI (labels, textos), inglés para código (variables, funciones)
- **`renderAll()` es el punto de verdad**: después de cualquier mutación de `State.monthData`, llamar `persistAndRender()` que guarda + re-renderiza

## Bugs conocidos (pendientes de fix)

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `style.css:16` | `--text3: #5555770` — hex de 7 dígitos, inválido (debe ser `#555577`) |
| 2 | `app.js:120-143` | `migrateMonthData()` muta los datos pero nunca los persiste → se re-migra en cada carga |
| 3 | `app.js:268` | Balance negativo (`available < 0`) se muestra con clase CSS `success` (verde) |
| 4 | `app.js:486` | Botón `#openSettings` no tiene event listener — no hace nada |
| 5 | `app.js:127-140` | Gastos migrados de `extra` reciben `active: true`, pero la regla general de variables asigna `active: false` |
| 6 | `app.js:253` | Chart.js se destruye y recrea en cada render → parpadeo visible |

## Notas de PWA

- El SW usa `Cache-First` para todos los assets → después del primer load funciona offline
- `CACHE_NAME = 'mis-gastos-v1'`: al cambiar assets, incrementar la versión manualmente
- `manifest.json`: los iconos usan `"purpose": "any maskable"` combinado — lo correcto es tener entradas separadas para `any` y `maskable`
