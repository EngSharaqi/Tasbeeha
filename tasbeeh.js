// Deep hues that read well on the ivory card and as a page background
const colors = ['#0b3d5c', '#1f4e3d', '#3b2a5a', '#5a2a3a', '#1e3a5f', '#2c3e50', '#0f4c5c', '#433a6b', '#6b2d2d', '#264d3b', '#2d3561', '#4a3a24', '#123b4a', '#50324a'];

const card = document.getElementById('card');
const zekrEl = document.getElementById('tasbeha-name');
const blessEl = document.getElementById('desc');
const typeEl = document.getElementById('type');
const metaEl = document.getElementById('meta');
const positionEl = document.getElementById('position');
const prevBtn = document.getElementById('prevZekr');
const nextBtn = document.getElementById('nextZekr');
const counterBtn = document.getElementById('btn');
const counterEl = document.getElementById('counter');
const targetEl = document.getElementById('target');
const ring = document.getElementById('ring');
const themeColor = document.querySelector('meta[name="theme-color"]');

const celebrate = document.getElementById('celebrate');
const confettiCanvas = document.getElementById('confetti');
const celebrateText = document.getElementById('celebrateText');
const celebrateShare = document.getElementById('celebrateShare');
const celebrateActions = document.getElementById('celebrateActions');
const sharePreview = document.getElementById('sharePreview');
const shareImage = document.getElementById('shareImage');
const shareBtn = document.getElementById('shareImageBtn');
const saveBtn = document.getElementById('saveImageBtn');

const SITE_URL = 'https://tasbeeha.vercel.app/';
const SHARE_W = 1080;
const SHARE_H = 1350;
const GOLD = '#b8913a';
const GOLD_SOFT = '#eadfc3';
const IVORY = '#fbf8f1';

let count = 0;
let currentZekr = null;
let currentCategory = null;
let currentIndex = 0;
let selectedCategory = null; // null = منوّع (random from all categories)
let colorIndex = -1;
let accentColor = colors[0];

// Azkar completed this session, keyed by `${slug}:${index}`
const completed = new Set();

let shareFile = null;
let shareUrl = '';
let shareToken = 0;
let stopConfetti = null;

const categoryBySlug = new Map(tasbeehas.map((category) => [category.slug, category]));

const randomIndex = (length) => Math.floor(Math.random() * length);

const entryAt = (category, index) => ({ category, index, zekr: category.content[index] });

const doneKey = (category, index) => `${category.slug}:${index}`;

const isCategoryDone = (category) =>
    category.content.every((_, index) => completed.has(doneKey(category, index)));

// Morning azkar from dawn until mid-afternoon, evening azkar otherwise
const defaultCategory = () => {
    const hour = new Date().getHours();
    return categoryBySlug.get(hour >= 4 && hour < 15 ? 'azkar_alsabah' : 'azkar_almasaa');
};

const pickZekr = () => {
    const category = tasbeehas[randomIndex(tasbeehas.length)];
    const entry = entryAt(category, randomIndex(category.content.length));
    return entry.zekr === currentZekr ? pickZekr() : entry;
};

// Step through the selected category (wrapping around), or pick at random
const nextEntry = (step = 1) => {
    if (!selectedCategory) return pickZekr();
    const { length } = selectedCategory.content;
    return entryAt(selectedCategory, (currentIndex + step + length) % length);
};

const pickColor = () => {
    let index;
    do {
        index = randomIndex(colors.length);
    } while (index === colorIndex);
    colorIndex = index;
    return colors[index];
};

const renderCount = () => {
    const target = currentZekr.repeat;
    const done = count >= target;

    counterEl.textContent = count;
    targetEl.textContent = done ? 'اكتمل بحمد الله' : `من ${target}`;
    ring.style.strokeDasharray = `${Math.min(count / target, 1) * 100} 100`;
    ring.style.opacity = count ? 1 : 0;
    card.classList.toggle('is-done', done);
};

const renderMeta = () => {
    const random = !selectedCategory;
    const single = !random && selectedCategory.content.length === 1;

    metaEl.classList.toggle('is-random', random);
    prevBtn.hidden = random;
    nextBtn.hidden = random;
    prevBtn.disabled = single;
    nextBtn.disabled = single;
    positionEl.textContent = random
        ? 'منوّع'
        : `${currentIndex + 1} من ${selectedCategory.content.length}`;
};

const renderZekr = ({ category, zekr, index }) => {
    const bless = zekr.bless.trim();

    currentZekr = zekr;
    currentCategory = category;
    currentIndex = index;
    renderMeta();
    typeEl.textContent = category.typeAR;
    zekrEl.textContent = zekr.zekr.trim();
    zekrEl.classList.toggle('is-long', zekr.zekr.length > 180);
    blessEl.textContent = bless;
    blessEl.hidden = !bless;
    count = 0;
    renderCount();
};

const applyColor = () => {
    const color = pickColor();
    accentColor = color;
    document.documentElement.style.setProperty('--accent', color);
    themeColor.content = color;
};

/* ---------- Celebration: helpers ---------- */

const timesLabel = (n) => {
    if (n === 1) return 'مرة واحدة';
    if (n === 2) return 'مرتين';
    return n <= 10 ? `${n} مرات` : `${n} مرة`;
};

// Canvas has no color-mix(), so blend hex colors by hand (weight = share of `a`)
const mix = (a, b, weight) => {
    const toRgb = (hex) => {
        const n = parseInt(hex.slice(1), 16);
        return [n >> 16, (n >> 8) & 255, n & 255];
    };
    const [ra, ga, ba] = toRgb(a);
    const [rb, gb, bb] = toRgb(b);
    const blend = (x, y) => Math.round(x * weight + y * (1 - weight));
    return `rgb(${blend(ra, rb)}, ${blend(ga, gb)}, ${blend(ba, bb)})`;
};

// Four-pointed star (✦) centered on x, y
const drawStar = (ctx, x, y, radius) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? radius : radius * 0.38;
        const angle = -Math.PI / 2 + (i * Math.PI) / 4;
        ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
};

const roundRectPath = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

/* ---------- Celebration: confetti ---------- */

const launchConfetti = (canvas) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = ['#e6c874', GOLD, GOLD_SOFT, IVORY, mix(accentColor, '#ffffff', 0.45)];
    const piece = (props) => ({
        size: 7 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        tilt: Math.random() * Math.PI * 2,
        color: palette[randomIndex(palette.length)],
        star: Math.random() < 0.3,
        ...props,
    });

    const pieces = [];
    // Wave 1: cannons from both bottom corners
    for (let i = 0; i < 140; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        pieces.push(piece({
            x: dir === 1 ? -10 : width + 10,
            y: height * (0.6 + Math.random() * 0.3),
            vx: dir * (3 + Math.random() * (width / 90)),
            vy: -(8 + Math.random() * (height / 60)),
            delay: 0,
        }));
    }
    // Wave 2: gentle rain from the top
    for (let i = 0; i < 90; i++) {
        pieces.push(piece({
            x: Math.random() * width,
            y: -20 - Math.random() * height * 0.4,
            vx: (Math.random() - 0.5) * 2,
            vy: 2 + Math.random() * 3,
            delay: 700,
        }));
    }

    const start = performance.now();
    let last = start;
    let rafId;

    const frame = (now) => {
        const dt = Math.min((now - last) / 16.67, 3);
        const elapsed = now - start;
        let alive = false;
        last = now;
        ctx.clearRect(0, 0, width, height);

        for (const p of pieces) {
            if (elapsed < p.delay) {
                alive = true;
                continue;
            }
            p.vx *= Math.pow(0.985, dt);
            p.vy = Math.min(p.vy + 0.25 * dt, 5.5);
            p.tilt += 0.08 * dt;
            p.rot += p.vr * dt;
            p.x += (p.vx + Math.sin(p.tilt) * 0.8) * dt;
            p.y += p.vy * dt;
            if (p.y > height + 30) continue;

            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            if (p.star) {
                drawStar(ctx, 0, 0, p.size * 0.75);
            } else {
                const h = p.size * 0.55 * Math.abs(Math.cos(p.tilt)) + 1;
                ctx.fillRect(-p.size / 2, -h / 2, p.size, h);
            }
            ctx.restore();
        }

        if (alive) rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
        cancelAnimationFrame(rafId);
        ctx.clearRect(0, 0, width, height);
    };
};

/* ---------- Celebration: shareable image ---------- */

const loadShareFonts = () => {
    if (!document.fonts) return Promise.resolve();
    const sample = 'تسبيحة 0123';
    const fonts = ['700 40px Amiri', '800 40px Tajawal', '700 40px Tajawal', '500 40px Tajawal'];
    return Promise.all(fonts.map((font) => document.fonts.load(font, sample))).catch(() => {});
};

// Same geometric tile as the page backdrop
const drawPattern = (ctx) => {
    const tile = 120;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < SHARE_W; x += tile) {
        for (let y = 0; y < SHARE_H; y += tile) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(tile / 96, tile / 96);
            ctx.strokeRect(28, 28, 40, 40);
            ctx.save();
            ctx.translate(48, 48);
            ctx.rotate(Math.PI / 4);
            ctx.strokeRect(-20, -20, 40, 40);
            ctx.restore();
            ctx.beginPath();
            ctx.arc(48, 48, 10, 0, Math.PI * 2);
            ctx.moveTo(0, 0);
            ctx.lineTo(20, 20);
            ctx.moveTo(96, 0);
            ctx.lineTo(76, 20);
            ctx.moveTo(0, 96);
            ctx.lineTo(20, 76);
            ctx.moveTo(96, 96);
            ctx.lineTo(76, 76);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.restore();
};

const wrapLines = (ctx, text, maxWidth) => {
    const lines = [];
    let line = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
        const test = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(test).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
};

// Largest font size at which the zekr fits inside the given box
const fitZekr = (ctx, text, maxWidth, maxHeight) => {
    let size = 60;
    let lines;
    for (; size >= 24; size -= 2) {
        ctx.font = `700 ${size}px Amiri, serif`;
        lines = wrapLines(ctx, text, maxWidth);
        if (lines.length * size * 1.75 <= maxHeight) break;
    }
    size = Math.max(size, 24);
    const lineHeight = size * 1.75;
    const maxLines = Math.floor(maxHeight / lineHeight);
    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] += ' …';
    }
    return { size, lines, lineHeight };
};

const createShareImage = async ({ category, zekr }, accent) => {
    await loadShareFonts();

    const canvas = document.createElement('canvas');
    canvas.width = SHARE_W;
    canvas.height = SHARE_H;
    const ctx = canvas.getContext('2d');
    const cx = SHARE_W / 2;
    const accentInk = mix(accent, '#000000', 0.8);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Background
    const bg = ctx.createLinearGradient(0, 0, SHARE_W * 0.35, SHARE_H);
    bg.addColorStop(0, accent);
    bg.addColorStop(1, mix(accent, '#04060b', 0.35));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SHARE_W, SHARE_H);

    const glow = ctx.createRadialGradient(cx, 0, 0, cx, 0, SHARE_W * 0.75);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SHARE_W, SHARE_H);
    drawPattern(ctx);

    // Brand
    ctx.font = '700 64px Amiri, serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('تسبيحة', cx, 108);
    const brandHalf = ctx.measureText('تسبيحة').width / 2;
    ctx.fillStyle = '#e6c874';
    drawStar(ctx, cx - brandHalf - 40, 112, 14);
    drawStar(ctx, cx + brandHalf + 40, 112, 14);

    // Card
    const card = { x: 80, y: 200, w: SHARE_W - 160, h: 970, r: 44 };
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 80;
    ctx.shadowOffsetY = 40;
    roundRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
    ctx.fillStyle = IVORY;
    ctx.fill();
    ctx.restore();

    roundRectPath(ctx, card.x + 16, card.y + 16, card.w - 32, card.h - 32, card.r - 16);
    ctx.strokeStyle = GOLD_SOFT;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Category badge
    const badgeText = `✦  ${category.typeAR}`;
    ctx.font = '700 30px Tajawal, sans-serif';
    const badgeW = ctx.measureText(badgeText).width + 64;
    roundRectPath(ctx, cx - badgeW / 2, 262, badgeW, 58, 29);
    ctx.fillStyle = mix(accent, IVORY, 0.1);
    ctx.fill();
    ctx.fillStyle = accentInk;
    ctx.fillText(badgeText, cx, 293);

    // Zekr text, vertically centered in its box
    const box = { top: 360, bottom: 800 };
    const { size, lines, lineHeight } = fitZekr(ctx, zekr.zekr.trim(), 780, box.bottom - box.top);
    ctx.font = `700 ${size}px Amiri, serif`;
    ctx.fillStyle = accentInk;
    const firstY = (box.top + box.bottom) / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, cx, firstY + i * lineHeight));

    // Divider
    ctx.fillStyle = GOLD_SOFT;
    ctx.fillRect(cx - 150, 838, 120, 2);
    ctx.fillRect(cx + 30, 838, 120, 2);
    ctx.fillStyle = GOLD;
    drawStar(ctx, cx, 839, 11);

    // Completed counter
    const counterY = 960;
    ctx.beginPath();
    ctx.arc(cx, counterY, 112, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 9;
    ctx.stroke();

    const fill = ctx.createRadialGradient(cx, counterY - 40, 0, cx, counterY, 94);
    fill.addColorStop(0, mix(accent, '#ffffff', 0.75));
    fill.addColorStop(1, accent);
    ctx.beginPath();
    ctx.arc(cx, counterY, 94, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 80px Tajawal, sans-serif';
    ctx.fillText(String(zekr.repeat), cx, counterY - 12);
    ctx.font = '500 26px Tajawal, sans-serif';
    ctx.fillText(zekr.repeat >= 3 && zekr.repeat <= 10 ? 'مرات' : 'مرة', cx, counterY + 44);

    ctx.fillStyle = GOLD;
    ctx.font = '700 32px Tajawal, sans-serif';
    ctx.fillText('اكتمل بحمد الله', cx, 1112);

    // Footer
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 48px Amiri, serif';
    ctx.fillText('تقبّل الله منّا ومنكم', cx, 1214);

    // Site link pill
    const siteLabel = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    ctx.save();
    ctx.direction = 'ltr';
    ctx.font = '700 28px Tajawal, sans-serif';
    const pillW = ctx.measureText(siteLabel).width + 64;
    roundRectPath(ctx, cx - pillW / 2, 1256, pillW, 52, 26);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 200, 116, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(siteLabel, cx, 1283);
    ctx.restore();

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
    });
};

/* ---------- Celebration: dialog ---------- */

const setShareReady = (ready) => {
    const canShare = ready && Boolean(navigator.canShare?.({ files: [shareFile] }));
    const saveIsPrimary = ready && !canShare;

    sharePreview.classList.toggle('is-loading', !ready);
    shareImage.hidden = !ready;
    shareBtn.disabled = !ready;
    saveBtn.disabled = !ready;
    shareBtn.hidden = saveIsPrimary;
    saveBtn.classList.toggle('action-primary', saveIsPrimary);
    saveBtn.classList.toggle('action-outline', !saveIsPrimary);
    celebrateActions.classList.toggle('is-single', saveIsPrimary);
};

const openCelebration = async (finishedCategory = false) => {
    if (celebrate.open) return;

    const snapshot = { category: currentCategory, zekr: currentZekr };
    const token = ++shareToken;

    celebrateText.textContent = finishedCategory
        ? `أتممت جميع ما في «${snapshot.category.typeAR}»، تقبّل الله منك.`
        : `أتممت الذكر ${timesLabel(snapshot.zekr.repeat)} من ${snapshot.category.typeAR}، تقبّل الله منك.`;
    celebrateShare.hidden = false;
    setShareReady(false);
    celebrate.showModal();
    stopConfetti = launchConfetti(confettiCanvas);

    try {
        const blob = await createShareImage(snapshot, accentColor);
        if (token !== shareToken || !celebrate.open) return;
        shareFile = new File([blob], `tasbeeha-${Date.now()}.png`, { type: 'image/png' });
        shareUrl = URL.createObjectURL(blob);
        shareImage.src = shareUrl;
        setShareReady(true);
    } catch {
        if (token === shareToken) celebrateShare.hidden = true;
    }
};

const handleSaveImage = () => {
    if (!shareUrl) return;
    const link = document.createElement('a');
    link.href = shareUrl;
    link.download = shareFile.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
};

const handleShareImage = async () => {
    if (!shareFile) return;
    try {
        await navigator.share({
            files: [shareFile],
            title: 'تسبيحة',
            text: `أتممت ذكرًا عبر تسبيحة ✦ تقبّل الله منّا ومنكم\n${SITE_URL}`,
        });
    } catch (error) {
        if (error.name !== 'AbortError') handleSaveImage();
    }
};

celebrate.addEventListener('close', () => {
    shareToken++;
    stopConfetti?.();
    stopConfetti = null;
    if (shareUrl) URL.revokeObjectURL(shareUrl);
    shareUrl = '';
    shareFile = null;
    shareImage.removeAttribute('src');
});

// Click on the dimmed area (outside the panel) closes the dialog
celebrate.addEventListener('click', (event) => {
    if (event.target === celebrate) celebrate.close();
});

document.getElementById('celebrateClose').addEventListener('click', () => celebrate.close());
shareBtn.addEventListener('click', handleShareImage);
saveBtn.addEventListener('click', handleSaveImage);

const showEntry = (entry) => {
    applyColor();
    card.classList.add('is-changing');
    setTimeout(() => {
        renderZekr(entry);
        card.classList.remove('is-changing');
    }, 200);
};

const handleOther = () => showEntry(nextEntry(1));

const handlePrev = () => showEntry(nextEntry(-1));

const selectCategory = (category, index = 0) => {
    selectedCategory = category;
    showEntry(category ? entryAt(category, index) : pickZekr());
};

const handleClick = () => {
    count++;
    renderCount();

    counterEl.classList.remove('bump');
    void counterEl.offsetWidth; // restart the animation
    counterEl.classList.add('bump');

    const isComplete = count === currentZekr.repeat;

    if (navigator.vibrate) {
        navigator.vibrate(isComplete ? [40, 60, 40] : 10);
    }

    if (!isComplete) return;

    const wasDone = isCategoryDone(currentCategory);
    completed.add(doneKey(currentCategory, currentIndex));
    const finishedCategory =
        selectedCategory === currentCategory &&
        currentCategory.content.length > 1 &&
        !wasDone &&
        isCategoryDone(currentCategory);

    // Let the ring finish filling before celebrating
    setTimeout(() => openCelebration(finishedCategory), 450);
};

const handleReset = () => {
    count = 0;
    renderCount();
};

/* ---------- Azkar library ---------- */

const library = document.getElementById('library');
const libraryBody = document.getElementById('libraryBody');
const libraryList = document.getElementById('libraryList');
const libraryEmpty = document.getElementById('libraryEmpty');
const searchInput = document.getElementById('librarySearch');
const quickSection = document.getElementById('quickSection');
const quickChips = document.getElementById('quickChips');

const QUICK_PICKS = [
    { slug: null, label: 'منوّع' },
    { slug: 'azkar_alsabah', label: 'أذكار الصباح' },
    { slug: 'azkar_almasaa', label: 'أذكار المساء' },
    { slug: 'hisn_2', label: 'أذكار النوم' },
    { slug: 'hisn_27', label: 'أذكار بعد الصلاة' },
    { slug: 'hisn_129', label: 'الاستغفار' },
    { slug: 'hisn_130', label: 'التسبيح والتحميد' },
];

const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

const svgIcon = (path) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    node.setAttribute('d', path);
    svg.append(node);
    return svg;
};

const azkarCountLabel = (n) => {
    if (n === 1) return 'ذكر واحد';
    if (n === 2) return 'ذكران';
    return n <= 10 ? `${n} أذكار` : `${n} ذكرًا`;
};

// Search ignores tashkeel, tatweel and common letter variants
const normalize = (text) =>
    text
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .toLowerCase();

let searchIndex = null;
const getSearchIndex = () => {
    searchIndex ??= new Map(
        tasbeehas.map((category) => [
            category,
            {
                name: normalize(category.typeAR),
                items: category.content.map(({ zekr }) => normalize(zekr)),
            },
        ]),
    );
    return searchIndex;
};

const renderQuickChips = () => {
    quickChips.replaceChildren(
        ...QUICK_PICKS.filter(({ slug }) => !slug || categoryBySlug.has(slug)).map(({ slug, label }) => {
            const chip = el('button', 'chip');
            chip.type = 'button';
            chip.dataset.slug = slug ?? '';
            if (!slug) chip.append(svgIcon('M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5'));
            chip.append(label);
            const active = (selectedCategory?.slug ?? null) === slug;
            chip.classList.toggle('is-active', active);
            chip.setAttribute('aria-pressed', active);
            return chip;
        }),
    );
};

const renderItems = (group, category, indices) => {
    const list = el('ol', 'group-list');
    for (const index of indices ?? category.content.keys()) {
        const { zekr, repeat } = category.content[index];
        const done = completed.has(doneKey(category, index));
        const current = category === currentCategory && index === currentIndex;

        const item = el('button', 'item');
        item.type = 'button';
        item.dataset.slug = category.slug;
        item.dataset.index = index;
        item.classList.toggle('is-current', current);
        item.classList.toggle('is-done', done);
        if (current) item.setAttribute('aria-current', 'true');

        item.append(
            el('span', 'item-num', done ? '✓' : String(index + 1)),
            el('span', 'item-text', zekr.trim()),
            el('span', 'item-repeat', timesLabel(repeat)),
        );
        const row = el('li');
        row.append(item);
        list.append(row);
    }
    group.append(list);
    group.dataset.rendered = 'true';
};

// `indices` limits the items shown (search matches); null renders all of them on first open
const renderGroup = (category, indices) => {
    const group = el('details', 'group');
    group.dataset.slug = category.slug;
    group.classList.toggle('is-current', category === currentCategory);

    const summary = el('summary', 'group-head');
    summary.append(
        el('span', 'group-name', category.typeAR),
        el('span', 'group-count', azkarCountLabel(category.content.length)),
        svgIcon('M6 9l6 6 6-6'),
    );
    group.append(summary);

    if (indices) {
        renderItems(group, category, indices);
        group.open = true;
    }
    return group;
};

const renderLibrary = () => {
    const query = normalize(searchInput.value.trim());
    const groups = [];

    for (const category of tasbeehas) {
        if (!query) {
            groups.push(renderGroup(category, null));
            continue;
        }
        const { name, items } = getSearchIndex().get(category);
        if (name.includes(query)) {
            groups.push(renderGroup(category, null));
            continue;
        }
        const matches = [...items.keys()].filter((index) => items[index].includes(query));
        if (matches.length) groups.push(renderGroup(category, matches));
    }

    quickSection.hidden = Boolean(query);
    libraryList.replaceChildren(...groups);
    libraryEmpty.hidden = groups.length > 0;
};

const openLibrary = () => {
    searchInput.value = '';
    renderQuickChips();
    renderLibrary();
    library.showModal();
    libraryBody.scrollTop = 0;
};

libraryList.addEventListener(
    'toggle',
    (event) => {
        const group = event.target;
        if (!group.open || group.dataset.rendered) return;
        renderItems(group, categoryBySlug.get(group.dataset.slug), null);
    },
    true, // toggle doesn't bubble
);

libraryBody.addEventListener('click', (event) => {
    const item = event.target.closest('.item');
    const chip = event.target.closest('.chip');
    if (!item && !chip) return;

    library.close();
    if (item) {
        selectCategory(categoryBySlug.get(item.dataset.slug), Number(item.dataset.index));
    } else {
        selectCategory(categoryBySlug.get(chip.dataset.slug) ?? null);
    }
});

searchInput.addEventListener('input', renderLibrary);

library.addEventListener('click', (event) => {
    if (event.target === library) library.close();
});

document.getElementById('libraryClose').addEventListener('click', () => library.close());
document.getElementById('openLibrary').addEventListener('click', openLibrary);
document.getElementById('typeBtn').addEventListener('click', openLibrary);

counterBtn.addEventListener('click', handleClick);
prevBtn.addEventListener('click', handlePrev);
nextBtn.addEventListener('click', handleOther);
document.getElementById('anotherTasbeeha').addEventListener('click', handleOther);
document.getElementById('reset').addEventListener('click', handleReset);
document.getElementById('celebrateNext').addEventListener('click', () => {
    celebrate.close();
    handleOther();
});

document.addEventListener('keydown', (event) => {
    if (document.querySelector('dialog[open]') || event.repeat) return;
    if (event.target.closest('input, textarea')) return;

    // Arrows step through the selected category (RTL: left = next)
    if (selectedCategory && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) {
        event.preventDefault();
        if (event.code === 'ArrowLeft') handleOther();
        else handlePrev();
        return;
    }

    // Space bar counts too, unless a button/link is focused (it already handles Space)
    if (event.code !== 'Space' || event.target.closest('button, a')) return;
    event.preventDefault();
    handleClick();
});

document.getElementById('year').textContent = new Date().getFullYear();

// Deep link from the static azkar pages: ?c=<slug>&z=<1-based zekr number>
const params = new URLSearchParams(location.search);
selectedCategory = categoryBySlug.get(params.get('c')) ?? defaultCategory();
const linkedIndex = Number.parseInt(params.get('z'), 10) - 1;
applyColor();
renderZekr(
    entryAt(
        selectedCategory,
        linkedIndex >= 0 && linkedIndex < selectedCategory.content.length ? linkedIndex : 0,
    ),
);
