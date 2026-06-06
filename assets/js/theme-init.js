(function () {
  const storageKey = "portfolio-theme";

  function normalizeTheme(value) {
    return value === "light" ? "light" : "dark";
  }

  function readTheme() {
    try {
      return normalizeTheme(localStorage.getItem(storageKey));
    } catch (error) {
      return "dark";
    }
  }

  function setTheme(theme, persist) {
    const selectedTheme = normalizeTheme(theme);
    document.documentElement.dataset.theme = selectedTheme;

    if (persist !== false) {
      try {
        localStorage.setItem(storageKey, selectedTheme);
      } catch (error) {
        console.warn("The theme preference could not be saved.", error);
      }
    }

    return selectedTheme;
  }

  window.PortfolioTheme = {
    get: readTheme,
    set: setTheme
  };

  setTheme(readTheme(), false);
})();
