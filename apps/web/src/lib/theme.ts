/**
 * Runs inline in <head> before first paint, so a dark preference never flashes
 * light. Order is explicit user choice (cookie), then the operating system, then
 * light. The attribute is set on <html>, the one place the theme lives.
 */
export const THEME_COOKIE = "loopnote_theme";

export const themeScript = `(function () {
  var theme = "light";

  try {
    var stored = null;
    var cookies = document.cookie ? document.cookie.split("; ") : [];

    for (var index = 0; index < cookies.length; index += 1) {
      if (cookies[index].indexOf("${THEME_COOKIE}=") === 0) {
        var value = cookies[index].slice("${THEME_COOKIE}=".length);
        if (value === "dark" || value === "light") stored = value;
      }
    }

    if (stored !== null) {
      theme = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch (error) {
    theme = "light";
  }

  document.documentElement.setAttribute("data-theme", theme);
})();`;
