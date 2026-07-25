# Fonts

Custom fonts used by the PDF renderer. These are bundled as `.ttf` files and registered at render time.

## Available Fonts

| Family | Files | Weights |
|--------|-------|---------|
| Inter | `Inter-Regular.ttf`, `Inter-Bold.ttf` | 400, 700 |
| Merriweather | `Merriweather-Regular.ttf`, `Merriweather-Bold.ttf` | 400, 700 |

## Adding New Fonts

1. Download `.ttf` files (Regular + Bold weights recommended)
2. Place them in this directory
3. Add registration in `src/pdf/fonts.ts` via `registerFontFile()`
4. Update `registerFontsFromDocument()` to scan for the new family name

## How Font Registration Works

- `registerDefaultFonts()` pre-registers Inter and Merriweather at startup
- `registerFontsFromDocument(document)` scans the document nodes for any custom `fontFamily` values and registers them
- If a requested font file is missing, registration is silently skipped and Helvetica is used as fallback