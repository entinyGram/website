(() => {
  const params = new URLSearchParams(location.search);
  const allowed = ["en", "ua"];
  let lang = params.get("lang") || localStorage.getItem("lang") || (document.documentElement.lang === "uk" ? "ua" : "en");
  if (!allowed.includes(lang)) lang = "en";

  const persist = (key, value) => {
    try {
      localStorage.setItem(key, value);
      document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Lax`;
    } catch { /* Keep the current in-memory preference if storage is unavailable. */ }
  };
  const syncThemeButton = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    document.querySelector("#themeToggle .iconify")?.setAttribute("data-icon", dark ? "solar:sun-bold" : "solar:moon-bold");
    document.querySelector("#themeToggle")?.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#151312" : "#ffffff");
  };
  let translationsPromise = null;
  const getTranslations = async () => {
    if (!translationsPromise) {
      translationsPromise = fetch("/docs/translations.json")
        .then((res) => {
          if (!res.ok) throw new Error("Translations request failed");
          return res.json();
        })
        .catch((err) => {
          translationsPromise = null;
          throw err;
        });
    }
    return translationsPromise;
  };

  const applyLanguage = async (nextLang) => {
    lang = nextLang;
    persist("lang", lang);
    const translations = await getTranslations();
    const dictionary = translations[lang] || translations.en || {};
    document.querySelectorAll("[data-lang-key]").forEach((element) => {
      const value = dictionary[element.dataset.langKey];
      if (!value) return;
      if (element.dataset.langHtml === "true" || value.includes("<")) element.innerHTML = value;
      else element.textContent = value;
    });
    document.querySelectorAll(".lang-btn").forEach((button) => button.classList.toggle("active", button.dataset.lang === lang));
    document.documentElement.lang = lang === "ua" ? "uk" : "en";
    document.body.classList.add("translations-ready");
    window.dispatchEvent(new CustomEvent("site-language-change", { detail: { lang } }));
  };

  document.querySelector("#themeToggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    persist("theme", next);
    syncThemeButton();
  });
  document.querySelectorAll(".lang-btn").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.lang === lang) return;
    const nextLang = button.dataset.lang;
    applyLanguage(nextLang).then(() => {
      if (!document.querySelector(".downloads-page")) return;
      const url = new URL(location.href);
      url.searchParams.set("lang", nextLang);
      history.replaceState(null, "", url);
    }).catch(() => {});
  }));
  syncThemeButton();
  applyLanguage(lang).catch(() => document.body.classList.add("translations-ready"));
})();
