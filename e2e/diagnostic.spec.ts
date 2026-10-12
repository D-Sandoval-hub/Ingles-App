import { expect, test } from '@playwright/test';

test('test diagnóstico completo → resultado → plan del día 1 con tarjetas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Hacer el test diagnóstico' }).click();
  await page.getByRole('button', { name: 'Comenzar' }).click();

  // Vocabulario: 62 ítems sí/no.
  const vocab = page.getByTestId('vocab-test');
  for (let i = 0; i < 62; i++) {
    await vocab.getByRole('button', { name: i % 3 === 0 ? 'No la conozco' : 'La conozco', exact: true }).click();
  }

  // Gramática: 25 preguntas.
  for (let i = 0; i < 25; i++) {
    await page.getByTestId('mcq').getByRole('button').first().click();
  }
  // Lectura y listening: 3 textos × 3 preguntas cada uno.
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < 9; i++) {
      await page.getByTestId('mcq').getByRole('button').first().click();
    }
  }
  // Dictado: 4 frases.
  const dictation = page.getByTestId('dictation');
  for (let i = 0; i < 4; i++) {
    await dictation.getByRole('textbox').fill('I live in a small apartment');
    await dictation.getByRole('button', { name: 'Siguiente' }).click();
  }
  // Lectura en voz alta: se omite (no hay micrófono en el test).
  const skipOrContinue = page.getByRole('button', { name: /Omitir el resto|Continuar/ });
  await skipOrContinue.first().click();

  // Expresión oral: autoevaluación.
  await expect(page.getByText('Habla durante ~1 minuto')).toBeVisible();
  for (const label of ['Fluidez', 'Precisión gramatical', 'Vocabulario', 'Pronunciación']) {
    await page.getByRole('group', { name: label }).getByRole('button').nth(1).click();
  }
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Escritura con errores típicos → el detector los marca.
  await page.locator('#assess-writing').fill('Hi Ana. I have 30 years and I work in a bank. People is very nice. I want that you come next month.');
  await page.getByRole('button', { name: 'Ver errores típicos detectados' }).click();
  await expect(page.getByText('Edad con "have"')).toBeVisible();
  await expect(page.getByText('"People" es plural')).toBeVisible();
  for (const label of ['Cumplimiento de la tarea', 'Gramática', 'Vocabulario', 'Organización']) {
    await page.getByRole('group', { name: label }).getByRole('button').nth(1).click();
  }
  await page.getByTestId('finish-assessment').click();

  await expect(page.getByRole('heading', { name: 'Resultado' })).toBeVisible();
  await expect(page.getByTestId('overall-level')).toHaveText(/Pre-A1|A1|A2|B1|B2|C1/);

  await page.getByRole('link', { name: 'Ir a mi plan de hoy' }).click();
  await expect(page.getByRole('heading', { name: /Día 1 de 30/ })).toBeVisible();
  await expect(page.getByTestId('block-srs')).toBeVisible();

  // Las tarjetas existen y los errores quedaron registrados.
  await page.getByRole('link', { name: 'Progreso' }).click();
  await expect(page.getByText('Edad con "have"')).toBeVisible();
  await page.getByRole('link', { name: 'Repaso' }).click();
  await expect(page.getByTestId('flashcard')).toBeVisible();
});

test('el test a medias se retoma después de recargar', async ({ page }) => {
  await page.goto('/#/test/diagnostic');
  await page.getByRole('button', { name: 'Comenzar' }).click();
  await page.getByTestId('vocab-test').getByRole('button', { name: 'La conozco', exact: true }).click();
  await page.getByTestId('vocab-test').getByRole('button', { name: 'La conozco', exact: true }).click();
  await page.reload();
  await expect(page.getByText('(3/62)')).toBeVisible();
});
