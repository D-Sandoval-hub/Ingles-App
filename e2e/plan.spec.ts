import { expect, test } from '@playwright/test';
import { startWithoutTest } from './helpers';

test('día mínimo, registro de input y panel de progreso', async ({ page }) => {
  await startWithoutTest(page);
  await expect(page.getByText('Día completo')).toBeVisible();
  await page.getByTestId('toggle-minimum').click();
  await expect(page.getByText('Día mínimo (2 h)')).toBeVisible();
  await expect(page.getByTestId('block-input')).toContainText('/ 40 min');

  await page.getByTestId('block-input').getByRole('link').click();
  await page.locator('#manual').fill('30');
  await page.getByRole('button', { name: 'Agregar minutos' }).click();
  await expect(page.getByText('Guardado: 30 min de input.')).toBeVisible();
  await page.getByRole('link', { name: 'Volver' }).click();
  await expect(page.getByTestId('input-today')).toHaveText('30 min');

  await page.getByRole('link', { name: 'Progreso' }).click();
  await expect(page.getByRole('heading', { name: 'Últimos 7 días' })).toBeVisible();
  await expect(page.getByText(/Input 0,5 h/)).toBeVisible();

  await page.getByRole('link', { name: 'Plan' }).click();
  await expect(page.getByRole('heading', { name: 'Plan de 30 días' })).toBeVisible();
});

test('bloque de listening: temporizador + dictado se guardan como sesión', async ({ page }) => {
  await startWithoutTest(page);
  await page.getByTestId('block-listening').getByRole('link').click();
  await page.getByRole('button', { name: 'Iniciar' }).click();
  await expect(page.getByTestId('timer')).toHaveText(/00:0[1-9]/, { timeout: 5000 });
  const d = page.getByTestId('dictation');
  await d.getByRole('textbox').fill('hello');
  await d.getByRole('button', { name: 'Revisar' }).click();
  await expect(page.getByText(/% de palabras correctas/)).toBeVisible();
  await page.getByTestId('finish-block').click();
  await expect(page.getByRole('heading', { name: /Día 1/ })).toBeVisible();
});

test('práctica libre de 5 minutos', async ({ page }) => {
  await startWithoutTest(page);
  await page.getByRole('link', { name: 'Práctica libre (5–15 min)' }).click();
  await page.getByRole('button', { name: '5 min', exact: true }).click();
  await expect(page.getByText(/Paso 1 de/)).toBeVisible();
});
