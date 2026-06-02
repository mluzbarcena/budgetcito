# CLAUDE.md — Budgetcito

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
- **Todo en inglés**: el código (variables, funciones, comentarios), los mensajes de commit y las descripciones de PR deben estar en inglés. La UI hoy está en español (labels, textos) — ver nota de traducción pendiente abajo.
- **`renderAll()` es el punto de verdad**: después de cualquier mutación de `State.monthData`, llamar `persistAndRender()` que guarda + re-renderiza

## Traducción pendiente

- La UI todavía tiene textos en español (labels, títulos de modales, toasts, empty states, etc.). Hay que migrarla a inglés en un PR dedicado de traducción. Hasta entonces, el código/commits/PRs nuevos van en inglés aunque convivan con strings de UI en español.

## Notas / mejoras pendientes

- `migrateMonthData()` migra gastos de `extra` con `active: ex.active ?? true` (preserva lo que el usuario ya había cargado), mientras que las variables sin `active` se asignan `active: false`. La diferencia es intencional y está documentada en los comentarios — no tocar sin entender el motivo.

## Notas de PWA

- El SW usa `Cache-First` para todos los assets → después del primer load funciona offline
- `CACHE_NAME = 'budgetcito-v2'`: al cambiar assets, incrementar la versión manualmente
- `manifest.json`: los iconos usan `"purpose": "any maskable"` combinado — lo correcto es tener entradas separadas para `any` y `maskable`
