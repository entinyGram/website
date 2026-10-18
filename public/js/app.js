let translations = {};

// 1. Sync theme and language from URL parameters if passed across domains
try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramLang = urlParams.get('lang');
    const paramTheme = urlParams.get('theme');

    if (paramLang === 'en' || paramLang === 'ua') {
        localStorage.setItem('lang', paramLang);
        document.cookie = `lang=${paramLang}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (paramTheme === 'dark' || paramTheme === 'light') {
        localStorage.setItem('theme', paramTheme);
        document.documentElement.setAttribute('data-theme', paramTheme);
        document.cookie = `theme=${paramTheme}; path=/; max-age=31536000; SameSite=Lax`;
    }

    // Clean up parameters from the address bar without reloading
    if (paramTheme || paramLang) {
        urlParams.delete('theme');
        urlParams.delete('lang');
        const cleanSearch = urlParams.toString();
        const cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
    }
} catch (e) {}

let currentLang = localStorage.getItem('lang') || 'en';

function t(key, fallback = '') {
    return translations[currentLang]?.[key] || fallback || key;
}

async function setTheme(theme, x, y) {
    const isDark = theme === 'dark';

    if (!document.startViewTransition) {
        document.documentElement.classList.add('no-transitions');
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
        updateThemeToggle(isDark);
        // Force reflow
        document.documentElement.offsetHeight;
        document.documentElement.classList.remove('no-transitions');
        return;
    }

    const clickX = x !== undefined && x !== null ? x : window.innerWidth / 2;
    const clickY = y !== undefined && y !== null ? y : window.innerHeight / 2;

    document.documentElement.classList.add('no-transitions');

    const transition = document.startViewTransition(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
        updateThemeToggle(isDark);
    });

    transition.ready.then(() => {
        const endRadius = Math.hypot(
            Math.max(clickX, innerWidth - clickX),
            Math.max(clickY, innerHeight - clickY)
        );

        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0 at ${clickX}px ${clickY}px)`,
                    `circle(${endRadius}px at ${clickX}px ${clickY}px)`,
                ],
            },
            {
                duration: 500,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)',
            }
        );
    });

    try {
        await transition.finished;
    } finally {
        document.documentElement.classList.remove('no-transitions');
    }
}

function updateThemeToggle(isDark) {
    const icon = isDark ? 'solar:sun-bold' : 'solar:moon-bold';
    const iconEl = document.querySelector('#themeToggle .iconify');
    if (iconEl) iconEl.setAttribute('data-icon', icon);
}

function applyTranslations(lang) {
    lang = lang || currentLang;
    if (!translations[lang]) return;

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (translations[lang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[lang][key];
            } else if (el.dataset.langHtml === 'true' || translations[lang][key].includes('<')) {
                el.innerHTML = translations[lang][key];
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });

    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.dataset.langPlaceholder;
        if (translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
    document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;

    document.body.classList.add('translations-ready');
    window.dispatchEvent(new CustomEvent('site-language-change', { detail: { lang } }));
}

function updateLangButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

async function initCommon() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        const icon = currentTheme === 'dark' ? 'solar:sun-bold' : 'solar:moon-bold';
        themeBtn.querySelector('.iconify')?.setAttribute('data-icon', icon);

        themeBtn.addEventListener('click', (e) => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            setTheme(newTheme, e.clientX, e.clientY);
        });
    }

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLang = btn.dataset.lang;
            applyTranslations(currentLang);
            updateLangButtons(currentLang);
        });
    });

    try {
        const res = await fetch('/docs/translations.json?v=' + Date.now());
        translations = await res.json();
        applyTranslations(currentLang);
        updateLangButtons(currentLang);
    } catch (e) {
        console.error('Error loading translations', e);
        document.body.classList.add('translations-ready');
    }

    // Inject toast container
    if (!document.getElementById('toastContainer')) {
        const tc = document.createElement('div');
        tc.id = 'toastContainer';
        document.body.appendChild(tc);
    }
}

// ========= GLOBAL TOAST SYSTEM =========
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('[Toast]', message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `ee-toast ee-toast-${type}`;
    const icons = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// Cross-domain state synchronization interceptor (is-a.dev <-> vercel.app)
document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    try {
        const targetUrl = new URL(href, window.location.origin);
        const currentHost = window.location.hostname;
        const isCurrentIsADev = currentHost.includes('is-a.dev');
        const isCurrentVercel = currentHost.includes('vercel.app');

        const isTargetCrossDomain =
            (isCurrentIsADev && targetUrl.hostname.includes('vercel.app')) ||
            (isCurrentVercel && targetUrl.hostname.includes('is-a.dev'));

        if (isTargetCrossDomain) {
            const activeTheme = localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'light';
            const activeLang = localStorage.getItem('lang') || currentLang || 'en';
            targetUrl.searchParams.set('theme', activeTheme);
            targetUrl.searchParams.set('lang', activeLang);
            anchor.href = targetUrl.toString();
        }
    } catch (_) {}
}, { capture: true });

window.addEventListener('DOMContentLoaded', initCommon);
window.t = t;
window.applyTranslations = applyTranslations;
