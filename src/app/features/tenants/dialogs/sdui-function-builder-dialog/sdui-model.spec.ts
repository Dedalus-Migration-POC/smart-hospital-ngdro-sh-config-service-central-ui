import { describe, expect, it } from 'vitest';

import {
  cleanField,
  createEmptyDescriptor,
  createEmptyField,
  createEmptyOnSubmit,
  descriptorToJson,
  type SduiDescriptor,
} from './sdui-model';

/**
 * Regressione: queste chiavi vivono in nodi che il wizard RICOSTRUISCE da zero
 * (la radice del descrittore e `onSubmit`), quindi non sono coperte da withRaw().
 * Prima del fix un giro JSON -> wizard -> JSON le perdeva in silenzio: per
 * `completeLogin` significava un login che va a buon fine lato backend ma
 * lascia l'utente sloggato.
 */
describe('serializzazione delle chiavi dei nodi ricostruiti da zero', () => {
  /** Nei flow `onSubmit` vive sull'ultimo step, non sulla radice. */
  function flowWithOnSubmit(): SduiDescriptor {
    const d = createEmptyDescriptor('flow', 'whr_login');
    const step = d.steps[0];
    step.isLastStep = true;
    step.onSubmit = createEmptyOnSubmit();
    step.onSubmit.endpoint = '/login';
    return d;
  }

  function onSuccessOf(d: SduiDescriptor): Record<string, unknown> {
    const steps = descriptorToJson(d)['steps'] as Record<string, unknown>[];
    const onSubmit = steps[0]['onSubmit'] as Record<string, unknown>;
    return (onSubmit['onSuccess'] ?? {}) as Record<string, unknown>;
  }

  it('scrive onSuccess.completeLogin quando attivo', () => {
    const d = flowWithOnSubmit();
    d.steps[0].onSubmit!.onSuccess.completeLogin = true;

    expect(onSuccessOf(d)['completeLogin']).toBe(true);
  });

  it('scrive completeLogin anche insieme a showSuccessScreen, che sta su un ramo separato', () => {
    const d = flowWithOnSubmit();
    d.steps[0].onSubmit!.onSuccess.completeLogin = true;
    d.steps[0].onSubmit!.onSuccess.showSuccessScreen = { titleKey: 'ok', actions: [] };

    const onSuccess = onSuccessOf(d);
    expect(onSuccess['completeLogin']).toBe(true);
    expect(onSuccess['showSuccessScreen']).toBeTruthy();
  });

  it('omette completeLogin quando non attivo', () => {
    const d = flowWithOnSubmit();

    expect(onSuccessOf(d)['completeLogin']).toBeUndefined();
  });

  it('scrive showTechnicalError solo sui flow e solo se attivo', () => {
    const flow = createEmptyDescriptor('flow', 'whr_login');
    expect(descriptorToJson(flow)['showTechnicalError']).toBeUndefined();

    flow.showTechnicalError = true;
    expect(descriptorToJson(flow)['showTechnicalError']).toBe(true);

    // La chiave e' letta da flow_renderer.dart: su uno screen non avrebbe effetto.
    const screen = createEmptyDescriptor('screen', 'whr_home');
    screen.showTechnicalError = true;
    expect(descriptorToJson(screen)['showTechnicalError']).toBeUndefined();
  });
});

describe('opzioni textInput (§8)', () => {
  it('serializza tutte le opzioni impostate', () => {
    const f = createEmptyField('textInput');
    f.id = 'username';
    f.hintKey = 'WhrLogin.usernameHint';
    f.textCase = 'upper';
    f.keyboardType = 'number';
    f.obscureText = true;
    f.maxLength = 16;
    f.trim = true;

    expect(cleanField(f)).toMatchObject({
      hintKey: 'WhrLogin.usernameHint',
      textCase: 'upper',
      keyboardType: 'number',
      obscureText: true,
      maxLength: 16,
      trim: true,
    });
  });

  it("non scrive keyboardType 'text', che e' gia' il default dell'engine", () => {
    const f = createEmptyField('textInput');
    f.keyboardType = 'text';
    expect(cleanField(f)['keyboardType']).toBeUndefined();
  });

  it('non scrive le opzioni su un component diverso da textInput', () => {
    const f = createEmptyField('datePicker');
    f.textCase = 'upper';
    f.maxLength = 16;
    const out = cleanField(f);
    expect(out['textCase']).toBeUndefined();
    expect(out['maxLength']).toBeUndefined();
  });
});
