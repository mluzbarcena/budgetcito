# Budgetcito — Mis Gastos

PWA de control de gastos mensuales personales. Funciona 100% offline, sin cuenta, sin backend. Los datos viven en tu dispositivo.

## Features

- **Sueldo neto por mes** — configurable mes a mes, con opción de ocultar el monto
- **Gastos fijos** — se arrastran automáticamente al siguiente mes con su monto (ej: alquiler, servicios)
- **Gastos variables** — se cargan de cero cada mes (ej: nafta, entretenimiento)
- **Resumen visual** — sueldo, total gastado, disponible, % ahorro y % gastado
- **Gráficos** — distribución en torta o barras (Chart.js)
- **Navegación por mes** — picker de mes/año, botones prev/next
- **Toggle "incluir este mes"** — marcá un gasto como omitido sin eliminarlo
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
| Offline | Service Worker (Cache-First) |
| Instalación | Web App Manifest (PWA) |

No hay framework, bundler, ni dependencias de npm.

---

## Análisis técnico — Puntos de mejora

### Bugs

**1. Typo en variable CSS** (`style.css:16`)
`--text3: #5555770` es un hex de 7 dígitos (inválido). El browser lo ignora silenciosamente.
Fix: cambiar a `#555577`.

**2. Migración no persiste** (`app.js:120-143`)
`migrateMonthData()` convierte datos del formato viejo (`extra` → `variable`) y los devuelve modificados, pero nunca los guarda en `localStorage`. Cada carga de ese mes re-ejecuta la migración desde cero.
Fix: llamar `Repository.saveMonth()` al final de la migración si hubo cambios.

**3. Balance negativo en verde** (`app.js:268`)
Cuando los gastos superan el sueldo, el campo "Disponible" muestra el número negativo con la clase CSS `success` (verde). Es misleading.
Fix: aplicar clase `danger` dinámicamente cuando `available < 0`.

**4. Botón ⚙ sin funcionalidad** (`app.js:wireEvents`)
El botón `#openSettings` existe en el HTML pero nunca se conecta a un event listener. Toca y no pasa nada.
Fix: implementar un modal de configuración o remover el botón.

**5. `active` inconsistente en migración** (`app.js:127` vs `app.js:140`)
Los gastos migrados desde el campo legado `extra` reciben `active: true`, pero la regla general para variables sin campo `active` asigna `false`. Comportamiento divergente según el camino de migración.

**6. Chart se destruye y recrea en cada render** (`app.js:253`)
Cada cambio llama `renderAll()` → `renderChart()` → `State.chart.destroy()` + `new Chart(...)`. Esto causa un parpadeo visible. Chart.js permite actualizar datos en lugar de recrear:
```js
State.chart.data.labels = labels;
State.chart.data.datasets[0].data = amounts;
State.chart.update();
```

### Arquitectura / calidad

**7. Sin export/import de datos**
Toda la información vive en `localStorage`. Si el usuario borra datos del navegador, instala la app en otro dispositivo, o el browser limpia el storage, pierde todo su historial. Para una app de finanzas personales esto es un riesgo real.
Mejora: botón de exportar a JSON / importar desde JSON.

**8. Moneda hardcodeada a ARS** (`app.js:147`)
`Intl.NumberFormat` está fijo a `'ARS'`. No se puede cambiar sin tocar código.
Mejora: guardar la moneda en `settings` y construir el formatter dinámicamente.

**9. Sin validación JS de inputs**
El atributo `min="0"` en los inputs de monto es fácilmente bypasseable desde devtools o con un paste. No hay validación del lado JS para valores negativos ni para el año en el month picker (e.g., año 0 o año 99999 son aceptados).

**10. Inline styles en HTML** (`index.html:85,93,97-98`)
Varios elementos usan `style="..."` directamente en el HTML, inconsistente con el resto que usa clases CSS. Dificulta el mantenimiento y theming.

**11. Service Worker sin versionado automático** (`sw.js:6`)
`CACHE_NAME = 'mis-gastos-v1'` se actualiza manualmente. Si se despliegan cambios y no se incrementa la versión, los usuarios pueden quedar con assets cacheados viejos.

**12. `manifest.json` — `purpose` mezclado**
Usar `"purpose": "any maskable"` en una sola entrada no es ideal. La spec de PWA recomienda entradas separadas para `any` y `maskable` para mayor compatibilidad entre launchers de Android/iOS.

---

## Análisis UX — Puntos de mejora

### Críticos

**1. Botón ⚙ que no hace nada**
Genera confusión inmediata. El usuario lo va a tocar esperando ver configuración. Debe conectarse a funcionalidad real o eliminarse del header.

**2. Balance negativo mostrado en verde**
Ver un número como `-$150.000` resaltado en verde cuando uno está en rojo es una señal visual incorrecta. El color del campo "Disponible" debe ser dinámico: verde cuando hay sobrante, rojo cuando hay déficit.

**3. Sin confirmación al eliminar un gasto**
Tocar "Eliminar" en el modal elimina el gasto inmediatamente, sin confirmación. En mobile, donde los taps son menos precisos, es fácil hacerlo por accidente. Agregar un segundo toque de confirmación o un undo temporal.

### Navegación

**4. Dos mecanismos redundantes para navegar meses**
El header tiene `◀ Junio 2025 ▶` que abre un picker, y además hay dos FABs (◀/▶) en la esquina inferior derecha. Es duplicación con distinta posición y distinto comportamiento, lo que confunde. Recomendación: unificar en un solo mecanismo — los FABs como navegación rápida prev/next, y el header solo como display del mes actual que abre el picker.

**5. Month picker requiere dos pasos innecesarios**
Seleccionar un mes en la grilla y luego presionar "Ir" es un paso de más. Seleccionar directamente debería navegar (o al menos habilitar el botón visualmente como principal CTA).

**6. Sin swipe para cambiar de mes**
En mobile, deslizar horizontalmente para ir al mes anterior/siguiente es el gesto esperado. Los FABs son una solución de escritorio trasplantada a mobile.

### Onboarding / feedback

**7. Sin guía para usuarios nuevos**
La app arranca con los gastos fijos en $0 y sin sueldo configurado. No hay ningún mensaje indicando por dónde empezar. Un banner tipo "Configurá tu sueldo para empezar" en el primer uso mejoraría la activación.

**8. Sin feedback visual al guardar**
Los modales se cierran en silencio tras guardar. Un toast o una microanimación (e.g., el valor del card actualizándose con una transición) daría confirmación de que la acción funcionó.

**9. Logo ₿ (Bitcoin)**
La app trabaja con pesos argentinos, pero el logo usa el símbolo de Bitcoin. Aunque el diseño original puede haber sido intencional como estética, para usuarios nuevos es confuso. Un `$` o `₱` sería más representativo.

### Accesibilidad y detalles de diseño

**10. Badge "omitido" muy pequeño** (`style.css:187`)
`font-size: 0.65rem` (≈ 10px) es difícil de leer en pantallas de baja resolución o para usuarios con baja visión. Aumentar a `0.75rem` mínimo.

**11. Sin estilos `focus-visible`**
Al navegar con teclado (Tab), los elementos interactivos no muestran indicadores de foco claros más allá del default del browser (que a veces se suprime con `outline: none`). Necesario para accesibilidad.

**12. `% ahorro` y `% gastado` pueden no sumar 100%**
Cuando los gastos superan el sueldo, `% gastado` se trunca a 100% (por el `Math.min`) pero `% ahorro` mostraría 0%, no el déficit real. La lógica actual oculta información importante: que el usuario está gastando más de lo que gana.
Mejora: mostrar el déficit como porcentaje negativo, o agregar un indicador visual de "en rojo".

**13. Iconos y colores no configurables**
Al crear un nuevo gasto, el ícono (📌 para fijos, 📝 para variables) y el color se asignan automáticamente. El usuario no puede personalizarlos. Agregar un picker de emoji y paleta de colores en el modal de creación.
