import { expect, test } from "@playwright/test";

test("harness route renders on the server", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Loopnote foundation");
  await expect(
    page.getByRole("heading", { level: 2, name: "Wired so far" }),
  ).toBeVisible();
});

test("the page has no console errors on load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(errors).toEqual([]);
});
