// Generates static, crawlable pages for every azkar category from azkar.js,
// so search engines can index the full text of each zekr.
//
//   node scripts/build-seo.mjs
//
// Output: azkar/index.html, azkar/<slug>.html, sitemap.xml
// Re-run it whenever azkar.js changes.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SITE = 'https://tasbeeha.vercel.app';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'azkar');
const TODAY = new Date().toISOString().slice(0, 10);
const YEAR = new Date().getFullYear();

const tasbeehas = vm.runInNewContext(`${readFileSync(join(ROOT, 'azkar.js'), 'utf8')};tasbeehas`);

/* ---------- Helpers ---------- */

const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// Tatweel (ـ) is decorative and breaks matching for searches like "أصبحنا"
const clean = (text) => text.replace(/\u0640/g, '').replace(/\s+/g, ' ').trim();

const truncate = (text, max) => {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[،,.:؛\s]+$/, '')}…`;
};

const repeatLabel = (n) => {
    if (n === 1) return 'مرة واحدة';
    if (n === 2) return 'مرتان';
    if (n <= 10) return `${n} مرات`;
    return `${n} مرة`;
};

const countLabel = (n) => {
    if (n === 1) return 'ذكر واحد';
    if (n === 2) return 'ذكران';
    if (n <= 10) return `${n} أذكار`;
    return `${n} ذكرًا`;
};

const isMorningEvening = (category) => category.slug.startsWith('azkar_');

const pagePath = (category) => `/azkar/${category.slug}`;

const appLink = (category, index) =>
    `/?c=${encodeURIComponent(category.slug)}${index === undefined ? '' : `&z=${index + 1}`}`;

const jsonLd = (data) =>
    `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const breadcrumbs = (items) => ({
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name,
        item: `${SITE}${path}`,
    })),
});

/* ---------- Layout ---------- */

const layout = ({ path, title, description, jsonLdGraph, counterHref, body }) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <meta name="theme-color" content="#0b3d5c">
    <link rel="canonical" href="${SITE}${path}" />

    <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
    <link rel="manifest" href="/site.webmanifest" />

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="تسبيحة">
    <meta property="og:locale" content="ar_AR">
    <meta property="og:url" content="${SITE}${path}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${SITE}/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${SITE}/og-image.png">

    ${jsonLd({ '@context': 'https://schema.org', '@graph': jsonLdGraph })}

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700;800&display=swap"
        rel="stylesheet" />
    <link rel="stylesheet" href="/tasbeeh.css">
    <link rel="stylesheet" href="/pages.css">
</head>

<body>
    <div class="backdrop" aria-hidden="true"></div>

    <header class="topbar">
        <a class="brand" href="/">
            <span class="brand-logo"><img src="/tasbeeh.ico" alt="" width="28" height="28" /></span>
            <span>تسبيحة</span>
        </a>
        <a class="topbar-btn" href="${counterHref}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
            </svg>
            عدّاد التسبيح
        </a>
    </header>

    <main class="doc">
${body}
    </main>

    <footer class="footer">
        <p class="slogan">﴿ يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا ﴾</p>
        <small>
            Tasbeeha · Created by
            <a href="https://linkedin.com/in/EngSharaqi" target="_blank" rel="noopener">Mohamed A. Sharaqi</a>
            · © 2023–${YEAR}
        </small>
    </footer>
</body>

</html>
`;

const crumbsNav = (items) => `        <nav class="crumbs" aria-label="مسار التنقل">
            <ol>
${items
    .map(([name, path], i) =>
        i === items.length - 1
            ? `                <li aria-current="page">${escapeHtml(name)}</li>`
            : `                <li><a href="${path}">${escapeHtml(name)}</a></li>`,
    )
    .join('\n')}
            </ol>
        </nav>`;

const website = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'تسبيحة' };

/* ---------- Category page ---------- */

const categoryPage = (category, i) => {
    const name = clean(category.typeAR);
    const items = category.content;
    const path = pagePath(category);
    const firstZekr = clean(items[0].zekr);

    const title = isMorningEvening(category)
        ? `${name} مكتوبة كاملة مع الفضل وعدد التكرار | تسبيحة`
        : `${name} - حصن المسلم | تسبيحة`;
    const description = truncate(
        `${name}: ${truncate(firstZekr, 100)} — ${countLabel(items.length)} بالتشكيل مع عدد التكرار والفضل، وعدّاد تسبيح إلكتروني.`,
        300,
    );

    const trail = [
        ['الرئيسية', '/'],
        ['الأذكار', '/azkar'],
        [name, path],
    ];

    const prev = tasbeehas[i - 1];
    const next = tasbeehas[i + 1];

    const list = items
        .map((zekr, index) => {
            const bless = clean(zekr.bless);
            return `                <li class="zekr-item" id="z${index + 1}">
                    <p class="zekr-text">${escapeHtml(clean(zekr.zekr))}</p>${
                        bless
                            ? `
                    <p class="zekr-bless"><strong>الفضل:</strong> ${escapeHtml(bless)}</p>`
                            : ''
                    }
                    <div class="zekr-foot">
                        <span class="chip">${items.length > 1 ? `${index + 1} · ` : ''}يُقال ${repeatLabel(zekr.repeat)}</span>
                        <a class="zekr-go" href="${appLink(category, index)}">سبّح بهذا الذكر ←</a>
                    </div>
                </li>`;
        })
        .join('\n');

    const pager = [
        prev &&
            `            <a class="prev" href="${pagePath(prev)}" rel="prev"><small>السابق</small>${escapeHtml(clean(prev.typeAR))}</a>`,
        next &&
            `            <a class="next" href="${pagePath(next)}" rel="next"><small>التالي</small>${escapeHtml(clean(next.typeAR))}</a>`,
    ]
        .filter(Boolean)
        .join('\n');

    const body = `${crumbsNav(trail)}

        <article class="card doc-card">
            <h1 class="doc-title">${escapeHtml(name)}</h1>
            <p class="doc-intro">
                ${escapeHtml(name)} مكتوبة بالتشكيل: ${countLabel(items.length)} مع عدد مرات تكرار كل ذكر${
                    items.some((zekr) => zekr.bless.trim()) ? ' وفضله' : ''
                }${isMorningEvening(category) ? '' : '، من كتاب حصن المسلم'}.
                اضغط «سبّح بهذا الذكر» لتفتحه في عدّاد التسبيح.
            </p>
            <ol class="zekr-list">
${list}
            </ol>
        </article>

        <nav class="doc-pager" aria-label="أذكار أخرى">
${pager}
        </nav>`;

    return layout({
        path,
        title,
        description,
        counterHref: appLink(category),
        jsonLdGraph: [
            website,
            {
                '@type': 'WebPage',
                '@id': `${SITE}${path}#page`,
                url: `${SITE}${path}`,
                name: title,
                headline: name,
                description,
                inLanguage: 'ar',
                dateModified: TODAY,
                isPartOf: { '@id': `${SITE}/#website` },
                breadcrumb: { '@id': `${SITE}${path}#breadcrumb` },
            },
            { ...breadcrumbs(trail), '@id': `${SITE}${path}#breadcrumb` },
        ],
        body,
    });
};

/* ---------- Index page ---------- */

const indexPage = () => {
    const path = '/azkar';
    const title = 'الأذكار والأدعية مكتوبة كاملة | أذكار الصباح والمساء وحصن المسلم - تسبيحة';
    const description =
        'كل الأذكار والأدعية مكتوبة بالتشكيل مع عدد التكرار والفضل: أذكار الصباح، أذكار المساء، أذكار النوم، أذكار الصلاة والوضوء، وأدعية حصن المسلم كاملة.';
    const trail = [
        ['الرئيسية', '/'],
        ['الأذكار', path],
    ];

    const group = (heading, categories) => `            <section class="cat-group">
                <h2>${heading}</h2>
                <ul class="cat-grid">
${categories
    .map(
        (category) =>
            `                    <li><a href="${pagePath(category)}">${escapeHtml(clean(category.typeAR))}<span>${countLabel(category.content.length)}</span></a></li>`,
    )
    .join('\n')}
                </ul>
            </section>`;

    const body = `${crumbsNav(trail)}

        <article class="card doc-card">
            <h1 class="doc-title">الأذكار والأدعية مكتوبة</h1>
            <p class="doc-intro">
                ${tasbeehas.length} بابًا من الأذكار والأدعية مكتوبة بالتشكيل مع عدد التكرار والفضل،
                من أذكار الصباح والمساء وكتاب حصن المسلم.
            </p>
${group('أذكار الصباح والمساء', tasbeehas.filter(isMorningEvening))}
${group('حصن المسلم', tasbeehas.filter((category) => !isMorningEvening(category)))}
        </article>`;

    return layout({
        path,
        title,
        description,
        counterHref: '/',
        jsonLdGraph: [
            website,
            {
                '@type': 'CollectionPage',
                '@id': `${SITE}${path}#page`,
                url: `${SITE}${path}`,
                name: title,
                description,
                inLanguage: 'ar',
                dateModified: TODAY,
                isPartOf: { '@id': `${SITE}/#website` },
                breadcrumb: { '@id': `${SITE}${path}#breadcrumb` },
                mainEntity: {
                    '@type': 'ItemList',
                    numberOfItems: tasbeehas.length,
                    itemListElement: tasbeehas.map((category, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: clean(category.typeAR),
                        url: `${SITE}${pagePath(category)}`,
                    })),
                },
            },
            { ...breadcrumbs(trail), '@id': `${SITE}${path}#breadcrumb` },
        ],
        body,
    });
};

/* ---------- Sitemap ---------- */

const sitemap = () => {
    const url = (path, priority, changefreq = 'monthly') => `    <url>
        <loc>${SITE}${path}</loc>
        <lastmod>${TODAY}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
    url('/', '1.0'),
    url('/azkar', '0.9'),
    ...tasbeehas.map((category) => url(pagePath(category), isMorningEvening(category) ? '0.9' : '0.7')),
].join('\n')}
</urlset>
`;
};

/* ---------- Write ---------- */

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

writeFileSync(join(OUT, 'index.html'), indexPage());
tasbeehas.forEach((category, i) => {
    writeFileSync(join(OUT, `${category.slug}.html`), categoryPage(category, i));
});
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap());

console.log(`Generated ${tasbeehas.length + 1} pages in azkar/ and sitemap.xml`);
