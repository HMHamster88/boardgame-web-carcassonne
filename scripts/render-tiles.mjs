#!/usr/bin/env node
/**
 * Renders every tile template of the module into one static HTML page.
 *
 * The tiles are rendered with the real TileGraphic component through Vite SSR, so the
 * page shows exactly what the game shows. The styles of the component are inlined and
 * the page has no external dependencies - just open the file in a browser.
 *
 * Usage (from the module root):
 *   npm run render-tiles                 -> writes ./tiles.html
 *   npm run render-tiles -- out/tiles.html
 *   npm run render-tiles -- --rotations  -> also shows the tile in all four rotations
 *
 * Note: tile definitions are read from the built carcassonne-back package, so run
 * `npm run build -w back` first if you changed back/src/tiles.ts.
 */
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const frontRoot = path.join(projectRoot, 'front');

const args = process.argv.slice(2);
const showRotations = args.includes('--rotations');
const outputArg = args.find(arg => !arg.startsWith('--'));
const outputFile = path.resolve(projectRoot, outputArg ?? 'tiles.html');

const tileSize = 160;
const edgeLetter = { city: 'C', road: 'R', field: 'F' };

const server = await createServer({
    root: frontRoot,
    configFile: false,
    logLevel: 'warn',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false },
    plugins: [vue()]
});

const { default: TileGraphic } = await server.ssrLoadModule('/src/components/TileGraphic.vue');
const { tileTemplates } = await server.ssrLoadModule('carcassonne-back');

const sfc = await readFile(path.join(frontRoot, 'src/components/TileGraphic.vue'), 'utf8');
const styleMatch = sfc.match(/<style[^>]*>([\s\S]*?)<\/style>/);
if (!styleMatch) {
    throw new Error('TileGraphic.vue has no <style> block');
}
const tileGraphicCss = styleMatch[1];

async function renderTile(templateId, rotation) {
    const app = createSSRApp({
        render: () => h(TileGraphic, { templateId, size: tileSize, rotation, showFeatures: false })
    });
    return renderToString(app);
}

function svg(graphic) {
    return `<svg class="tile" viewBox="0 0 ${tileSize} ${tileSize}" width="${tileSize}" height="${tileSize}"
        xmlns="http://www.w3.org/2000/svg">${graphic}</svg>`;
}

const cards = [];

for (const template of tileTemplates) {
    const graphic = await renderTile(template.id, 0);
    const rotationCells = [];
    if (showRotations) {
        for (const rotation of [1, 2, 3]) {
            rotationCells.push(`
                    <figure class="rotation">
                        <div class="rotation-graphic">${await renderTile(template.id, rotation)}</div>
                        <figcaption>${rotation * 90}°</figcaption>
                    </figure>`);
        }
    }

    const edges = template.edges.map(edge => edgeLetter[edge]).join(' ');
    const cities = template.cityGroups.map(group => `[${group.join(',')}]`).join(' ');
    const roads = template.roadGroups.map(group => `[${group.join(',')}]`).join(' ');
    const flags = [
        template.starting ? 'start tile' : undefined,
        template.cloister ? 'cloister' : undefined,
        (template.cityPennants ?? []).some(pennants => pennants > 0) ? 'pennant' : undefined
    ].filter(Boolean);

    cards.push(`
            <article class="tile-card">
                <h2>${template.id}</h2>
                ${svg(graphic)}
                <dl>
                    <div><dt>edges (N E S W)</dt><dd>${edges}</dd></div>
                    <div><dt>count</dt><dd>${template.count}</dd></div>
                    ${cities ? `<div><dt>cities</dt><dd>${cities}</dd></div>` : ''}
                    ${roads ? `<div><dt>roads</dt><dd>${roads}</dd></div>` : ''}
                    ${flags.length ? `<div><dt>flags</dt><dd>${flags.join(', ')}</dd></div>` : ''}
                </dl>
                ${rotationCells.length ? `<div class="rotations">${rotationCells.join('')}</div>` : ''}
            </article>`);
}

const totalTiles = tileTemplates.reduce((sum, template) => sum + template.count, 0);
const deckTiles = tileTemplates
    .filter(template => !template.starting)
    .reduce((sum, template) => sum + template.count, 0);
const generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

const html = `<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <title>Carcassonne tiles (${tileTemplates.length} designs)</title>
    <style>
        :root {
            color-scheme: light;
            --page-bg: #f2f4ef;
            --card-bg: #ffffff;
            --text: #1f2d14;
            --muted: #5d6b52;
            --border: #cfd8c6;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 1.5rem;
            background: var(--page-bg);
            color: var(--text);
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        }

        header h1 {
            margin: 0 0 0.25rem;
            font-size: 1.4rem;
        }

        header p {
            margin: 0 0 1.25rem;
            color: var(--muted);
            font-size: 0.9rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
        }

        .tile-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 0.6rem;
            padding: 0.75rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.6rem;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
        }

        .tile-card h2 {
            margin: 0;
            font-size: 0.95rem;
            text-align: center;
            word-break: break-word;
        }

        .tile {
            display: block;
            border-radius: 0.35rem;
            outline: 1px solid var(--border);
        }

        dl {
            margin: 0;
            width: 100%;
            font-size: 0.78rem;
            display: grid;
            gap: 0.15rem;
        }

        dl div {
            display: flex;
            justify-content: space-between;
            gap: 0.5rem;
        }

        dt {
            color: var(--muted);
        }

        dd {
            margin: 0;
            font-variant-numeric: tabular-nums;
            text-align: right;
        }

        .rotations {
            display: flex;
            gap: 0.35rem;
            width: 100%;
            justify-content: center;
        }

        .rotation {
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.15rem;
        }

        .rotation-graphic {
            width: 3.5rem;
            height: 3.5rem;
            border: 1px solid var(--border);
            border-radius: 0.25rem;
            overflow: hidden;
        }

        .rotation-graphic svg {
            width: 100%;
            height: 100%;
            display: block;
        }

        .rotation figcaption {
            font-size: 0.7rem;
            color: var(--muted);
        }

        ${tileGraphicCss}
    </style>
</head>

<body>
    <header>
        <h1>Carcassonne tiles</h1>
        <p>${tileTemplates.length} designs, ${totalTiles} tiles (one is the start tile, so the deck holds
            ${deckTiles}). Generated ${generatedAt} from carcassonne-back tileTemplates.</p>
    </header>
    <main class="grid">${cards.join('')}
    </main>
</body>

</html>
`;

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, html, 'utf8');
await server.close();

console.log(`Rendered ${tileTemplates.length} designs (${totalTiles} tiles) to ${outputFile}`);
