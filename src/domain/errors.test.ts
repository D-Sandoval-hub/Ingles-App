import { describe, expect, it } from 'vitest';
import { detectErrors, ERROR_RULES, topErrors } from './errors';

const tagsOf = (text: string) => detectErrors(text).map((e) => e.tag);

describe('detector de errores', () => {
  it('cada regla detecta su propio ejemplo incorrecto y no el correcto', () => {
    for (const rule of ERROR_RULES) {
      expect(tagsOf(rule.example.wrong), `${rule.tag}: ${rule.example.wrong}`).toContain(rule.tag);
      expect(tagsOf(rule.example.right), `${rule.tag}: ${rule.example.right}`).not.toContain(rule.tag);
    }
  });

  it('no marca usos correctos comunes', () => {
    const ok = [
      'I have 20 years of experience in IT.',
      'Does she have a car?',
      "He doesn't like coffee.",
      'Let it go.',
      'I want to help you.',
      'We talked about the plan.',
      'It is important to sleep.',
      'People are friendly.',
      'I have lived here since 2020.',
      'Can you help it work?',
    ];
    for (const text of ok) expect(tagsOf(text), text).toEqual([]);
  });

  it('detecta varios errores en un texto y los ordena por posición', () => {
    const errs = detectErrors('I have 30 years. People is nice. She have two kids.');
    expect(errs.map((e) => e.tag)).toEqual(['have_age', 'people_is', 'third_person']);
  });

  it('topErrors cuenta y ordena', () => {
    expect(topErrors(['a', 'people_is', 'people_is', 'a', 'people_is'])[0]).toEqual({ tag: 'people_is', count: 3, label: '"People" es plural' });
  });
});
