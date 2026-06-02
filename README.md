# Budgetcito

A PWA for personal monthly expense tracking. Works 100% offline, no account, no backend. Your data lives on your device.

## Features

- **Net salary per month** — configurable month by month, with an option to hide the amount. It's the primary income and is always shown prominently
- **Variable income** — occasional inflows that don't happen every month (freelance, year-end bonus, sales, gifts). They add to the available balance like the salary does but are visually distinct; they start empty each month
- **Fixed expenses** — carried forward automatically to the next month with their amount (e.g. rent, utilities)
- **Variable expenses** — start from zero each month (e.g. fuel, entertainment)
- **Customizable icons and colors** — emoji picker and color palette on each expense or income
- **Visual summary** — salary (+ other income), total spent, available, % saved and % spent computed over total income (real values, no clamping)
- **Charts** — distribution as a pie or bar chart (Chart.js)
- **Month navigation** — picker with year navigation, prev/next buttons and horizontal swipe on mobile
- **"Include this month" toggle** — mark an expense as skipped without deleting it
- **Backup and restore** — export and import all your data as JSON from Settings
- **PWA mode** — installable to the home screen, works offline (Service Worker)

## Local usage

Requires an HTTP server (the Service Worker does not work with `file://`):

```bash
python -m http.server 8080
# then open http://localhost:8080
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI | HTML5 + CSS3 (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES2020) |
| Charts | Chart.js 4.4 (CDN) |
| Fonts | DM Sans + DM Mono (Google Fonts) |
| Persistence | `localStorage` |
| Backup | JSON export/import (in Settings ⚙) |
| Offline | Service Worker (Cache-First) |
| Installation | Web App Manifest (PWA) |

No framework, no bundler, no npm dependencies.

## Export / Import

The **Settings ⚙** modal has two actions:

- **↓ Export JSON** — downloads a `misGastos-YYYY-MM-DD.json` file with all months and settings
- **↑ Import JSON** — loads a previously exported file; replaces all current data

The exported file has this structure:

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

Use cases: switching devices, backing up before clearing the browser, sharing data between your phone and PC.
