import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../src/utils/preferences';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const siteUrl = 'https://dawalberto.github.io/workoutlog/';
const meta = (key: string) => html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]+)"`))?.[1];
const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);

describe('public search document', () => {
  it('keeps one canonical URL consistent with social metadata and the sitemap', () => {
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain(`rel="canonical" href="${siteUrl}"`);
    expect(meta('og:url')).toBe(siteUrl);
    expect(meta('twitter:url')).toBe(siteUrl);
    const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
    expect([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])).toEqual([siteUrl]);
    expect(meta('robots')).not.toContain('noindex');
  });

  it('provides matching descriptive search and share titles', () => {
    const title = html.match(/<title>(.*?)<\/title>/)![1];
    expect(title).toContain('RepNami');
    expect(meta('og:title')).toBe(title);
    expect(meta('twitter:title')).toBe(title);
    expect(meta('description')!.length).toBeGreaterThan(100);
    expect(meta('og:description')).toBe(meta('description'));
    expect(meta('twitter:description')).toBe(meta('description'));
  });

  it('describes supported capabilities without fabricated ratings or screenshots', () => {
    expect(schema['@type']).toBe('WebApplication');
    expect(schema.url).toBe(siteUrl);
    expect(schema.inLanguage).toEqual([...LANGUAGES]);
    expect(schema.description).toBe(meta('description'));
    expect(schema).not.toHaveProperty('aggregateRating');
    expect(schema).not.toHaveProperty('screenshot');
    expect(schema.image).toBe(meta('og:image'));
  });

  it('serves public content outside the React root with its own language', () => {
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    expect(footer).toContain('lang="es"');
    expect(footer).toContain('id="guia-repnami"');
    expect(footer).toContain('series, repeticiones y pesos');
    expect(footer).toContain('sin conexión');
    expect(footer.match(/<details /g)).toHaveLength(4);
    expect(html).toContain('<noscript>');
    expect(html.indexOf('<footer')).toBeGreaterThan(html.indexOf('</noscript>'));
    expect(footer).not.toMatch(/display:\s*none|aria-hidden|class="hidden/);
  });

  it('allows zoom and avoids unused external font stylesheets', () => {
    expect(meta('viewport')).toBe('width=device-width, initial-scale=1.0');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });

  it('references real social assets and lets the PWA plugin own the manifest', () => {
    const imagePath = meta('og:image')!.replace(siteUrl, '');
    expect(existsSync(new URL(`../public/${imagePath}`, import.meta.url))).toBe(true);
    expect(meta('twitter:image')).toBe(meta('og:image'));
    expect(html).not.toContain('rel="manifest"');
    expect(existsSync(new URL('../public/manifest.webmanifest', import.meta.url))).toBe(false);
  });
});
