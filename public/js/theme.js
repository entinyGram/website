(function () {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTheme = urlParams.get('theme');
        const urlLang = urlParams.get('lang');

        if (urlTheme === 'dark' || urlTheme === 'light') {
            localStorage.setItem('theme', urlTheme);
            document.cookie = `theme=${urlTheme}; path=/; max-age=31536000; SameSite=Lax`;
        }
        if (urlLang === 'en' || urlLang === 'ua') {
            localStorage.setItem('lang', urlLang);
            document.documentElement.lang = urlLang === 'ua' ? 'uk' : 'en';
            document.cookie = `lang=${urlLang}; path=/; max-age=31536000; SameSite=Lax`;
        }

        const activeTheme = urlTheme || localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', activeTheme);
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();
