import { expect, test } from '@playwright/test';
import { startWithoutTest } from './helpers';

test('repaso con FSRS: calificar, persistir y marcar "ya la sé"', async ({ page }) => {
  await startWithoutTest(page);
  await page.getByRole('link', { name: 'Repaso' }).click();
  const card = page.getByTestId('flashcard');
  await expect(card).toBeVisible();
  const firstWord = await card.locator('.word').innerText();
  expect(firstWord).toBe('the'); // la palabra más frecuente va primero

  await page.getByRole('button', { name: 'Mostrar respuesta' }).click();
  await expect(page.getByTestId('gloss')).toHaveText(/el, la/);
  await page.getByRole('button', { name: /^Bien/ }).click();
  await expect(page.getByText('1 repasadas')).toBeVisible();

  // "Ya la sé" saca la tarjeta nueva de la cola.
  const second = await card.locator('.word').innerText();
  await page.getByRole('button', { name: /Ya la sé/ }).click();
  await expect(card.locator('.word')).not.toHaveText(second);

  // La sesión se guarda al terminar y cuenta como tiempo activo.
  await page.getByRole('link', { name: 'Terminar' }).click();
  await expect(page.getByTestId('block-srs')).toContainText(/\/ 45 min/);

  // Persistencia tras recargar: 'the' ya no es nueva.
  await page.reload();
  await page.getByRole('link', { name: 'Repaso' }).click();
  await expect(card.locator('.word')).not.toHaveText('the');
});
