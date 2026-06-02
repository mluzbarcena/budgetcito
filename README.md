# Budgetcito — Mis Gastos

PWA de control de gastos mensuales personales. Funciona 100% offline, sin cuenta, sin backend. Los datos viven en tu dispositivo.

## Features

- **Sueldo neto por mes** — configurable mes a mes, con opción de ocultar el monto. Es el ingreso principal y siempre se muestra destacado
- **Ingresos variables** — entradas eventuales que no pasan todos los meses (freelance, aguinaldo, ventas, regalos). Suman al disponible como el sueldo pero se diferencian visualmente; se cargan de cero cada mes
- **Gastos fijos** — se arrastran automáticamente al siguiente mes con su monto (ej: alquiler, servicios)
- **Gastos variables** — se cargan de cero cada mes (ej: nafta, entretenimiento)
- **Íconos y colores personalizables** — picker de emoji y paleta de colores en cada gasto o ingreso
- **Resumen visual** — sueldo (+ otros ingresos), total gastado, disponible, % ahorro y % gastado calculados sobre el total de ingresos (valores reales, sin clamping)
- **Gráficos** — distribución en torta o barras (Chart.js)
- **Navegación por mes** — picker con navegación de año, botones prev/next y swipe horizontal en mobile
- **Toggle "incluir este mes"** — marcá un gasto como omitido sin eliminarlo
- **Backup y restore** — exportá e importá todos los datos como JSON desde Configuración
- **Modo PWA** — instalable en home screen, funciona offline (Service Worker)

## Uso local

Requiere servidor HTTP (el Service Worker no funciona con `file://`):

```bash
python -m http.server 8080
# luego abrí http://localhost:8080
```

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| UI | HTML5 + CSS3 (custom properties, grid, flexbox) |
| Lógica | JavaScript vanilla (ES2020) |
| Gráficos | Chart.js 4.4 (CDN) |
| Fuentes | DM Sans + DM Mono (Google Fonts) |
| Persistencia | `localStorage` |
| Backup | Export/Import JSON (en Configuración ⚙) |
| Offline | Service Worker (Cache-First) |
| Instalación | Web App Manifest (PWA) |

No hay framework, bundler, ni dependencias de npm.

## Export / Import

En el modal de **Configuración ⚙** hay dos acciones:

- **↓ Exportar JSON** — descarga un archivo `misGastos-YYYY-MM-DD.json` con todos los meses y settings
- **↑ Importar JSON** — carga un archivo exportado previamente; reemplaza todos los datos actuales

El archivo exportado tiene esta estructura:

```json
{
  "version": 1,
  "exportedAt": "2025-06-01T12:00:00.000Z",
  "settings": { "salaryHidden": false },
  "months": {
    "2025-06": {
      "monthKey": "2025-06",
      "salary": 1200000,
      "fixed": [...],
      "variable": [...],
      "income": [...]
    }
  }
}
```

Casos de uso: cambiar de dispositivo, hacer backup antes de borrar el browser, compartir datos entre el celular y la PC.
