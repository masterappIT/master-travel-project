---
description: Standardize user-facing address summaries while preserving detailed address data for selection and search views
applyTo: 'src/pages/**/*.vue,src/components/**/*.vue'
---

## Address display

- For user-facing address summaries, use `地區 · 區域＋地點名稱`; do not include road names, house numbers, floors, exits, or other detailed address text.
- Keep detailed `address`/`displayAddress` values separately for address-picker, search-result, and detail views. Never replace stored detailed data with the homepage summary.
- Homepage and compact route fields are limited to 18 Unicode characters total; when longer, truncate the summary and include `...` within the limit.
- Example: `香港 · 中西區美利大廈` and `深圳 · 南山區深圳灣口岸`; the detailed address remains available only in the address-selection or detail context.
- Keep current-location information independent from the address currently being edited. Selecting a destination must not change the displayed current-location city.
