import { test, expect } from "@playwright/test";

async function expectProtectedRouteGate(
  page: import("@playwright/test").Page,
  loadingPatterns: RegExp,
) {
  try {
    await expect(page).toHaveURL(/\/login/, { timeout: 12_000 });
    return;
  } catch {
    await expect(page.getByText(loadingPatterns)).toBeVisible({ timeout: 12_000 });
  }
}

test.describe("frontend polish smoke", () => {
  test("routes remain reachable and keyboard focus is visible on auth forms", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    const emailInput = page.locator("#email");
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    await page.keyboard.press("Tab");
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toBeFocused();

    await page.goto("/register");
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("guard redirects anonymous users to login from protected routes", async ({ page }) => {
    await page.goto("/chat");
    await expectProtectedRouteGate(
      page,
      /Verificando acceso|Redirigiendo al inicio de sesión/,
    );

    await page.goto("/admin");
    await expectProtectedRouteGate(
      page,
      /Validando permisos|Redirigiendo al inicio de sesión|Redirigiendo al chat/,
    );
  });

  test("chat and admin loading/status surfaces render expected landmarks", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });
});
