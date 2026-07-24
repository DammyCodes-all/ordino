import { Font } from "@react-pdf/renderer";

// Minimal font registration. For production, include font files under src/pdf/fonts
export function registerDefaultFonts() {
  try {
    // Rely on built-in fonts where possible; explicit registration can be added.
    // Example for custom font registration:
    // Font.register({ family: 'Inter', src: path.join(__dirname, 'fonts/Inter-Regular.ttf') })
    // Keep this function idempotent.
    return true;
  } catch (err) {
    // Non-fatal: renderer will fallback to default fonts
    return false;
  }
}

export default registerDefaultFonts;
