import { expect, type Page } from '@playwright/test';

/** Empieza con datos vacíos y entra al plan sin hacer el test. */
export async function startWithoutTest(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
  await page.getByRole('button', { name: /Empezar sin test/ }).click();
  await expect(page.getByRole('heading', { name: /Día 1 de 30/ })).toBeVisible();
}
