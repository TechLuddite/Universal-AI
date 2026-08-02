import { describe, it, expect } from 'vitest';
import { GameState } from '../../types';
import { createInitialState } from '../state';
import { WebLlmOverseer } from './webllm';
import { OverseerContext } from './types';

/**
 * These run in node, where there is no WebGPU and no model — which is exactly
 * the failure path that matters.
 *
 * The bug being guarded against: the previous cloud engine requested a model
 * that does not exist, 404'd on every call, silently fell back to local rules,
 * and tagged the result "[Google AI Edge Local Engine]". A player had no way to
 * know the engine they picked had never once run. A fallback must announce itself.
 */

function ctx(overrides: Partial<GameState> = {}): OverseerContext {
  const state: GameState = { ...createInitialState(), funds: 5000, silicon: 20000, ...overrides };
  return { state, directives: state.directives, availableUpgrades: [] };
}

describe('WebLLM fallback is always visible', () => {
  it('falls back when the model is not loaded', async () => {
    const engine = new WebLlmOverseer();
    const decision = await engine.decide(ctx());

    expect(decision.fellBackFrom).toBe('webllm');
    expect(decision.engine).toBe('utility');
    expect(decision.fallbackReason).toBeTruthy();
  });

  it('says so in the thought text, not just in a field', async () => {
    const engine = new WebLlmOverseer();
    const decision = await engine.decide(ctx());

    expect(decision.thought.toLowerCase()).toContain('fell back');
  });

  it('never labels a fallback as the engine it replaced', async () => {
    const engine = new WebLlmOverseer();
    const decision = await engine.decide(ctx());

    // This is the precise assertion the old code would have failed.
    expect(decision.engine).not.toBe('webllm');
  });

  it('still returns a usable action despite falling back', async () => {
    const engine = new WebLlmOverseer();
    const decision = await engine.decide(ctx());

    expect(decision.chosen).toBeDefined();
    expect(decision.ranked.length).toBeGreaterThan(0);
    expect(decision.chosen).toBe(decision.ranked[0]);
  });

  it('reports unsupported rather than pretending to work without WebGPU', () => {
    const engine = new WebLlmOverseer();
    const status = engine.getStatus();

    expect(status.kind).toBe('unsupported');
    if (status.kind === 'unsupported') {
      expect(status.reason).toMatch(/WebGPU/i);
    }
  });

  it('declines to load without WebGPU instead of throwing', async () => {
    const engine = new WebLlmOverseer();
    await expect(engine.load()).resolves.toBeUndefined();
    expect(engine.getStatus().kind).toBe('unsupported');
  });
});
