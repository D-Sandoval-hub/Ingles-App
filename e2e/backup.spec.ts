import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { startWithoutTest } from './helpers';

test('respaldo: descargar, borrar todo y restaurar', async ({ page }) => {
  await startWithoutTest(page);
  await page.goto('/#/input');
  await page.locator('#manual').fill('45');
  await page.getByRole('button', { name: 'Agregar minutos' }).click();
  await expect(page.getByText('Guardado: 45 min de input.')).toBeVisible();

  await page.goto('/#/ajustes');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar respaldo' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const json = JSON.parse(await readFile(path, 'utf8')) as { app: string; sessions: unknown[]; cards: unknown[] };
  expect(json.app).toBe('ingles-app');
  expect(json.sessions).toHaveLength(1);
  expect(json.cards).toHaveLength(1000);

  page.on('dialog', (d) => { void d.accept(); });
  await page.getByRole('button', { name: 'Borrar todos los datos' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();

  await page.goto('/#/ajustes');
  await page.locator('#restore').setInputFiles(path);
  await expect(page.getByText('Respaldo restaurado.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('input-today')).toHaveText('45 min');
});

test('rechaza un archivo de respaldo inválido', async ({ page }) => {
  await startWithoutTest(page);
  await page.goto('/#/ajustes');
  await page.locator('#restore').setInputFiles({ name: 'malo.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"otra"}') });
  await expect(page.getByText(/no tiene el formato esperado/)).toBeVisible();
});
