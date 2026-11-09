import { expect, test, type Page } from "@playwright/test";

const LIGHT_BG = "rgb(246, 247, 249)";
const DARK_BG = "rgb(15, 17, 23)";

/**
 * Aborts every script request. The inline theme script is still part of the HTML
 * and runs before the body paints, while React can never hydrate. A correct colour
 * here is therefore proof of first paint, not of a post-hydration effect.
 */
async function openWithoutHydration(page: Page): Promise<void> {
  await page.route("**/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
}

async function bodyBackground(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

async function accentVariable(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
  );
}

test.describe("dark preference", () => {
  test.use({ colorScheme: "dark" });

  test("paints the dark tokens before hydration", async ({ page }) => {
    await openWithoutHydration(page);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(DARK_BG);
    expect(await accentVariable(page)).toBe("#f0787d");
  });
});

test.describe("light preference", () => {
  test.use({ colorScheme: "light" });

  test("paints the light tokens before hydration", async ({ page }) => {
    await openWithoutHydration(page);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await bodyBackground(page)).toBe(LIGHT_BG);
    expect(await accentVariable(page)).toBe("#b93a41");
  });
});

test.describe("explicit choice", () => {
  test.use({ colorScheme: "light" });

  test("a theme cookie wins over the operating system", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      {
        name: "loopnote_theme",
        value: "dark",
        url: baseURL ?? "http://127.0.0.1:3100",
      },
    ]);
    await openWithoutHydration(page);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(DARK_BG);
  });
});

test("self-hosts Geist and makes no external font request", async ({ page, baseURL }) => {
  const fontRequests: string[] = [];

  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const origin = new URL(baseURL ?? "http://127.0.0.1:3100").origin;

  expect(fontRequests.length).toBeGreaterThan(0);
  expect(fontRequests.every((url) => url.startsWith(origin))).toBe(true);
  expect(fontRequests.some((url) => /geist/i.test(url))).toBe(true);

  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);

  expect(family).toMatch(/GeistSans/);
});
