#!/usr/bin/env node

/**
 * CNVS Web Stremio Addon
 * Addon para o Stremio que integra o catálogo do CNVS Web (VisionCine)
 * Site: https://www.cnvsweb.stream/
 * 
 * Funcionalidades:
 * - Catálogo de Filmes
 * - Catálogo de Séries
 * - Catálogo de Animes
 * - Busca por título
 * - Links diretos para o CNVS Web
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

// ─── Configuração do Manifest ───────────────────────────────────────────────

const manifest = {
    id: 'br.cnvsweb.stremio.addon',
    version: '1.0.0',
    name: 'CNVS Web (VisionCine)',
    description: 'Addon para o Stremio que integra o catálogo do CNVS Web (VisionCine) - Filmes, Séries e Animes em português. Requer conta no site para assistir.',
    logo: 'https://www.cnvsweb.stream/temas/pixer/assets/img/icon_free.png',
    background: 'https://image.tmdb.org/t/p/original/x32uNDlJdZAgKsmFCXCLdop1uCG.jpg',
    resources: ['catalog', 'stream', 'meta'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'cnvsweb-movies',
            name: 'CNVS Web - Filmes',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'cnvsweb-series',
            name: 'CNVS Web - Séries',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'cnvsweb-animes',
            name: 'CNVS Web - Animes',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['cnvsweb:'],
    behaviorHints: {
        adult: false,
        p2p: false
    }
};

// ─── Constantes ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.cnvsweb.stream';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Referer': 'https://www.cnvsweb.stream/',
    'Cache-Control': 'no-cache'
};
const PAGE_SIZE = 24;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// ─── Cache Simples em Memória ─────────────────────────────────────────────────

const cache = new Map();

function getCached(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return item.data;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// ─── Funções de Scraping ─────────────────────────────────────────────────────

/**
 * Extrai itens de uma página HTML do CNVS Web
 */
function extractItemsFromHtml(html, sourceUrl) {
    const $ = cheerio.load(html);
    const items = [];
    const isAnimePage = sourceUrl && sourceUrl.includes('/animes');

    $('.item.poster').each((i, el) => {
        const $el = $(el);
        const title = $el.find('h6').text().trim();
        const watchLink = $el.find('a[href*="/watch/"]').attr('href');

        if (!title || !watchLink) return;

        // Extrair slug da URL
        const slug = watchLink.replace(/.*\/watch\//, '').replace(/\/$/, '');
        if (!slug) return;

        // Extrair poster
        const posterStyle = $el.find('.content').attr('style') || '';
        let posterUrl = '';
        const posterMatch = posterStyle.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (posterMatch) {
            posterUrl = posterMatch[1];
        }

        // Determinar tipo baseado nas tags
        let type = 'movie';
        let isAnime = isAnimePage;
        let year = '';

        $el.find('.tags span').each((j, tag) => {
            const text = $(tag).text().trim();
            if (text.includes('Temporada')) {
                type = 'series';
            }
            if (/^\d{4}$/.test(text)) {
                year = text;
            }
        });

        // Verificar IMDb
        let imdbRating = '';
        const imdbText = $el.find('.tags').text();
        const imdbMatch = imdbText.match(/IMDb\s+([\d.]+)/);
        if (imdbMatch && parseFloat(imdbMatch[1]) > 0) {
            imdbRating = imdbMatch[1];
        }

        items.push({
            id: `cnvsweb:${slug}`,
            type,
            name: title,
            poster: posterUrl,
            slug,
            year,
            isAnime,
            imdbRating
        });
    });

    return items;
}

/**
 * Faz scraping de uma página de listagem do site
 */
async function scrapePage(url) {
    const cached = getCached(url);
    if (cached) return cached;

    try {
        const response = await axios.get(url, {
            headers: HEADERS,
            timeout: 20000,
            maxRedirects: 5
        });
        const items = extractItemsFromHtml(response.data, url);
        setCache(url, items);
        return items;
    } catch (err) {
        console.error(`[Scraper] Erro em ${url}:`, err.message);
        return [];
    }
}

/**
 * Busca conteúdo pelo termo de pesquisa
 */
async function searchContent(query) {
    const url = `${BASE_URL}/search.php?q=${encodeURIComponent(query)}`;
    const cached = getCached(`search:${query}`);
    if (cached) return cached;

    try {
        const response = await axios.get(url, {
            headers: HEADERS,
            timeout: 20000
        });
        const items = extractItemsFromHtml(response.data, url);
        setCache(`search:${query}`, items);
        return items;
    } catch (err) {
        console.error(`[Search] Erro ao buscar "${query}":`, err.message);
        return [];
    }
}

/**
 * Obtém metadados de um item específico
 */
async function getItemMeta(slug) {
    const cacheKey = `meta:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const url = `${BASE_URL}/watch/${slug}`;

    try {
        const response = await axios.get(url, {
            headers: HEADERS,
            timeout: 20000,
            maxRedirects: 3,
            validateStatus: (status) => status < 500
        });

        // Verificar se foi redirecionado para login
        const finalUrl = response.request && response.request.res &&
                         response.request.res.responseUrl;
        if (finalUrl && finalUrl.includes('/login')) {
            return null;
        }

        const $ = cheerio.load(response.data);

        // Tentar extrair título
        const title = $('h1').first().text().trim() ||
                      $('meta[property="og:title"]').attr('content') ||
                      $('title').text().replace('VisionCine -', '').trim() ||
                      slug.replace(/-/g, ' ');

        // Descrição
        const description = $('meta[property="og:description"]').attr('content') ||
                           $('.sinopse, .description, .overview').first().text().trim() || '';

        // Poster
        const poster = $('meta[property="og:image"]').attr('content') ||
                      $('.poster img').first().attr('src') || '';

        // Background
        const background = $('meta[property="og:image"]').attr('content') || '';

        // Gêneros
        const genres = [];
        $('.genre a, .tags a').each((i, el) => {
            genres.push($(el).text().trim());
        });

        const meta = { title, description, poster, background, genres };
        setCache(cacheKey, meta);
        return meta;
    } catch (err) {
        console.error(`[Meta] Erro para ${slug}:`, err.message);
        return null;
    }
}

/**
 * Obtém streams de um item - retorna links para o CNVS Web
 */
async function getStreams(slug, type) {
    const watchUrl = `${BASE_URL}/watch/${slug}`;

    const streams = [];

    // Stream principal - link direto para o site
    streams.push({
        name: '🎬 CNVS Web',
        description: 'Abrir no CNVS Web (VisionCine)\n⚠️ Requer conta no site',
        externalUrl: watchUrl,
        behaviorHints: {
            notWebReady: false,
            bingeGroup: `cnvsweb-${slug}`
        }
    });

    // Tentar extrair player da página (para usuários logados)
    try {
        const response = await axios.get(watchUrl, {
            headers: HEADERS,
            timeout: 15000,
            maxRedirects: 3,
            validateStatus: (status) => status < 500
        });

        // Verificar se foi redirecionado para login
        const finalUrl = response.request && response.request.res &&
                         response.request.res.responseUrl;
        if (finalUrl && finalUrl.includes('/login')) {
            // Usuário não logado - apenas retornar link externo
            return streams;
        }

        const $ = cheerio.load(response.data);
        const pageContent = response.data;

        // Procurar por URLs de stream M3U8 no código da página
        const m3u8Regex = /https?:\/\/[^\s"'<>]+\.m3u8(?:[^\s"'<>]*)?/g;
        const m3u8Matches = [...new Set(pageContent.match(m3u8Regex) || [])];

        m3u8Matches.forEach((url, i) => {
            streams.unshift({
                name: `🎬 CNVS Web - HLS ${i + 1}`,
                description: 'Stream HLS do CNVS Web',
                url: url,
                behaviorHints: {
                    bingeGroup: `cnvsweb-${slug}`
                }
            });
        });

        // Procurar por URLs MP4
        const mp4Regex = /https?:\/\/[^\s"'<>]+\.mp4(?:[^\s"'<>]*)?/g;
        const mp4Matches = [...new Set(pageContent.match(mp4Regex) || [])];

        mp4Matches.forEach((url, i) => {
            streams.unshift({
                name: `🎬 CNVS Web - MP4 ${i + 1}`,
                description: 'Stream MP4 do CNVS Web',
                url: url,
                behaviorHints: {
                    bingeGroup: `cnvsweb-${slug}`
                }
            });
        });

        // Procurar iframes de player
        $('iframe[src], iframe[data-src]').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (!src) return;

            const fullSrc = src.startsWith('http') ? src : `${BASE_URL}${src}`;

            // Filtrar apenas iframes de player
            if (src.includes('player') || src.includes('embed') ||
                src.includes('stream') || src.includes('video') ||
                src.includes('play') || src.includes('jwplayer') ||
                src.includes('playerjs')) {
                streams.push({
                    name: `🎬 CNVS Web - Player ${i + 1}`,
                    description: 'Player embutido do CNVS Web',
                    externalUrl: fullSrc
                });
            }
        });

    } catch (err) {
        console.error(`[Stream] Erro para ${slug}:`, err.message);
    }

    return streams;
}

// ─── Construção do Addon ─────────────────────────────────────────────────────

const builder = new addonBuilder(manifest);

// ── Handler de Catálogo ──────────────────────────────────────────────────────

builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`[Catalog] type=${type} id=${id} extra=${JSON.stringify(extra)}`);

    const search = extra && extra.search;
    const skip = parseInt((extra && extra.skip) || 0);

    let items = [];

    if (search) {
        // Busca por termo
        const results = await searchContent(search);

        // Filtrar por tipo e catálogo
        items = results.filter(item => {
            if (id === 'cnvsweb-animes') return item.isAnime;
            if (id === 'cnvsweb-movies') return item.type === 'movie';
            if (id === 'cnvsweb-series') return item.type === 'series';
            return item.type === type;
        });
    } else {
        // Listagem por categoria
        let url;
        if (id === 'cnvsweb-movies') {
            url = `${BASE_URL}/movies`;
        } else if (id === 'cnvsweb-series') {
            url = `${BASE_URL}/tvseries`;
        } else if (id === 'cnvsweb-animes') {
            url = `${BASE_URL}/animes`;
        } else {
            url = `${BASE_URL}/`;
        }

        const allItems = await scrapePage(url);

        // Filtrar por tipo
        if (id === 'cnvsweb-movies') {
            items = allItems.filter(item => item.type === 'movie');
        } else if (id === 'cnvsweb-series') {
            items = allItems.filter(item => item.type === 'series');
        } else if (id === 'cnvsweb-animes') {
            items = allItems; // Animes já são filtrados pela URL
        } else {
            items = allItems.filter(item => item.type === type);
        }
    }

    // Paginação
    const paginatedItems = items.slice(skip, skip + PAGE_SIZE);

    const metas = paginatedItems.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        poster: item.poster || '',
        posterShape: 'poster',
        releaseInfo: item.year || '',
        description: `Disponível no CNVS Web (VisionCine)\n${BASE_URL}/watch/${item.slug}`,
        ...(item.imdbRating ? { imdbRating: item.imdbRating } : {})
    }));

    return { metas };
});

// ── Handler de Meta ──────────────────────────────────────────────────────────

builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`[Meta] type=${type} id=${id}`);

    if (!id.startsWith('cnvsweb:')) {
        return { meta: null };
    }

    const slug = id.replace('cnvsweb:', '');
    const metaData = await getItemMeta(slug);

    // Nome formatado a partir do slug
    const nameFromSlug = slug
        .replace(/-\d+$/, '') // Remover número no final (ex: -16648)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    if (!metaData) {
        return {
            meta: {
                id,
                type,
                name: nameFromSlug,
                description: `Disponível no CNVS Web (VisionCine)\n${BASE_URL}/watch/${slug}`,
                links: [
                    {
                        name: 'Assistir no CNVS Web',
                        category: 'Ver Online',
                        url: `${BASE_URL}/watch/${slug}`
                    }
                ]
            }
        };
    }

    return {
        meta: {
            id,
            type,
            name: metaData.title || nameFromSlug,
            poster: metaData.poster || '',
            background: metaData.background || '',
            description: metaData.description || `Disponível no CNVS Web (VisionCine)`,
            ...(metaData.genres && metaData.genres.length > 0 ? { genres: metaData.genres } : {}),
            links: [
                {
                    name: 'Assistir no CNVS Web',
                    category: 'Ver Online',
                    url: `${BASE_URL}/watch/${slug}`
                }
            ]
        }
    };
});

// ── Handler de Stream ────────────────────────────────────────────────────────

builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`[Stream] type=${type} id=${id}`);

    if (!id.startsWith('cnvsweb:')) {
        return { streams: [] };
    }

    const slug = id.replace('cnvsweb:', '');
    const streams = await getStreams(slug, type);

    return { streams };
});

// ─── Iniciar Servidor ────────────────────────────────────────────────────────

const PORT = process.env.PORT || 7000;
const HOST = process.env.HOST || '0.0.0.0';

serveHTTP(builder.getInterface(), { port: PORT });

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║          🎬 CNVS Web Stremio Addon v1.0.0               ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║  📡 Servidor: http://localhost:${PORT}/                    ║`);
console.log(`║  📋 Manifest: http://localhost:${PORT}/manifest.json       ║`);
console.log(`║  🔗 Stremio:  stremio://localhost:${PORT}/manifest.json    ║`);
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║  Catálogos disponíveis:                                  ║');
console.log('║  • Filmes  • Séries  • Animes                           ║');
console.log('║  • Busca por título                                      ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');
