import { expect, test } from '@playwright/test';
import { startWithoutTest } from './helpers';

test('funciona sin conexión después de la primera visita', async ({ page, context }) => {
  await startWithoutTest(page);
  // Espera a que el service worker controle la página (precache listo).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Día 1 de 30/ })).toBeVisible();
  await expect(page.getByText(/Sin conexión/)).toBeVisible();

  // Repasar sin conexión y que se guarde.
  await page.getByRole('link', { name: 'Repaso' }).click();
  await page.getByRole('button', { name: 'Mostrar respuesta' }).click();
  await page.getByRole('button', { name: /^Bien/ }).click();
  await expect(page.getByText('1 repasadas')).toBeVisible();
  await context.setOffline(false);
});
