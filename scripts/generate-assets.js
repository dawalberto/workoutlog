import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Standard App Icon SVG (with rounded corners for favicon / desktop / apple)
const standardIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#09090b"/>
  <g transform="translate(56, 46) scale(16.66)">
    <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
          fill="#34d399" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

// 2. Maskable Icon SVG (full-bleed background + safe-zone scaled flame for Android)
const maskableIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#09090b"/>
  <g transform="translate(94, 84) scale(13.5)">
    <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
          fill="#34d399" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

// 3. OpenGraph / Twitter Card Banner (1200 x 630)
const ogImageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="30%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#059669" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#09090b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#09090b"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  
  <!-- Icon container -->
  <g transform="translate(120, 195)">
    <rect width="240" height="240" rx="54" fill="#18181b" stroke="#27272a" stroke-width="4"/>
    <g transform="translate(26, 22) scale(7.8)">
      <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
            fill="#34d399" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>

  <!-- Typography -->
  <text x="400" y="275" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="78" fill="#ffffff" letter-spacing="-2">WorkoutLog</text>
  <text x="400" y="340" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="30" fill="#34d399">Planificador &amp; Ejecutor de Rutinas</text>
  <text x="400" y="390" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="22" fill="#a1a1aa">Series • Repeticiones • Pesos • Temporizador de Descanso • PWA Offline</text>

  <!-- Feature Pills -->
  <g transform="translate(400, 420)">
    <rect width="170" height="42" rx="10" fill="#18181b" stroke="#27272a"/>
    <text x="85" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#34d399" text-anchor="middle">Modo Workout</text>
  </g>
  <g transform="translate(585, 420)">
    <rect width="190" height="42" rx="10" fill="#18181b" stroke="#27272a"/>
    <text x="95" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#e4e4e7" text-anchor="middle">Temporizador Rest</text>
  </g>
  <g transform="translate(790, 420)">
    <rect width="180" height="42" rx="10" fill="#18181b" stroke="#27272a"/>
    <text x="90" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#e4e4e7" text-anchor="middle">100% PWA Offline</text>
  </g>
</svg>`;

async function generateAssets() {
  console.log('Generating PWA & SEO visual assets...');

  // 1. Save SVG icons
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), standardIconSvg);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardIconSvg);

  const standardBuffer = Buffer.from(standardIconSvg);
  const maskableBuffer = Buffer.from(maskableIconSvg);
  const ogBuffer = Buffer.from(ogImageSvg);

  // 2. Generate PNG icons
  await sharp(standardBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(standardBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(standardBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(standardBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));
  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  await sharp(ogBuffer).resize(1200, 630).png().toFile(path.join(publicDir, 'og-image.png'));

  console.log('All icons and OG images generated successfully in /public!');
}

generateAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
