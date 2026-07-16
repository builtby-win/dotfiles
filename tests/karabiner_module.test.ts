import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

describe('Karabiner module wiring', () => {
  it('keeps a chezmoi-managed Karabiner config in the repo', () => {
    expect(fs.existsSync(path.join(repoRoot, 'chezmoi/dot_config/karabiner/karabiner.json'))).toBe(true);
  });


  it('supports both push and pull sync directions', () => {
    const script = readRepoFile('scripts/sync-karabiner.sh');
    expect(script).toContain('Usage: ./scripts/sync-karabiner.sh [push|pull]');
    expect(script).toContain('push_config()');
    expect(script).toContain('pull_config()');
    expect(script).toContain('Synced Karabiner -> dotfiles');
    expect(script).toContain('Synced dotfiles -> Karabiner');
  });

  it('exposes bb sync karabiner helper command', () => {
    const functionsSh = readRepoFile('shell/functions.sh');
    expect(functionsSh).toContain('bb sync karabiner');
    expect(functionsSh).toContain('Usage: bb sync <target> [push|pull]');
    expect(functionsSh).toContain('"$dotfiles_dir/scripts/sync-karabiner.sh" "$direction"');
  });

  it('documents how to import the live machine config', () => {
    const readme = readRepoFile('README.md');
    const docs = readRepoFile('docs/modules/karabiner.md');

    expect(readme).toContain('bb sync karabiner pull');
    expect(docs).toContain('./scripts/sync-karabiner.sh push');
    expect(docs).toContain('./scripts/sync-karabiner.sh pull');
    expect(docs).toContain('bb sync karabiner pull');
  });
  it('ports Kanata chords, app context, and Sculpt handling into Karabiner', () => {
    const config = JSON.parse(
      readRepoFile('chezmoi/dot_config/karabiner/karabiner.json'),
    );
    const rules = config.profiles[0].complex_modifications.rules;
    const descriptions = rules.map((rule: { description: string }) => rule.description);

    expect(descriptions).toContain('Neru chords: fj grid, jl recursive grid, dk scroll, df hints');
    expect(descriptions).toContain('jk chord: terminal leader or next-key Command');
    expect(descriptions).toContain('Hold j then Space for repeating Backspace outside GUI Vim editors');
    expect(descriptions).toContain('One-shot modifiers with Microsoft Sculpt layout parity');
    expect(descriptions).toContain('Right Option and Sculpt Menu: tap for next-key Hyper, hold for Hyper');

    const jkRule = rules.find(
      (rule: { description: string }) => rule.description === 'jk chord: terminal leader or next-key Command',
    );
    expect(
      jkRule.manipulators.map(
        (manipulator: { parameters: { 'basic.simultaneous_threshold_milliseconds': number } }) =>
          manipulator.parameters['basic.simultaneous_threshold_milliseconds'],
      ),
    ).toEqual([120, 120]);

    const serializedRules = JSON.stringify(rules);
    expect(serializedRules).toContain('frontmost_application_if');
    expect(serializedRules).toContain('frontmost_application_unless');
    expect(serializedRules).toContain('device_if');
    expect(serializedRules).toContain('sticky_modifier');
    expect(serializedRules).toContain('neru_mode');

    const builtInKeyboard = config.profiles[0].devices.find(
      (device: { identifiers: { product_id?: number; vendor_id?: number }; ignore?: boolean }) =>
        device.identifiers.vendor_id === 1452 && device.identifiers.product_id === 834,
    );
    expect(builtInKeyboard?.ignore).not.toBe(true);
  });

  it('wires Neru mode changes through the Karabiner CLI helper', () => {
    const helper = readRepoFile('chezmoi/dot_local/bin/executable_karabiner-layer');
    const neru = readRepoFile('chezmoi/dot_config/neru/config.toml');
    const setup = readRepoFile('setup.ts');

    expect(helper).toContain('karabiner_cli');
    expect(helper).toContain('--set-variables');
    expect(neru).toContain('~/.local/bin/karabiner-layer scroll');
    expect(neru).toContain('~/.local/bin/karabiner-layer nudge');
    expect(neru).toContain('~/.local/bin/karabiner-layer off');
    expect(neru).not.toContain('~/.local/bin/kanata-layer');
    const resetLines = neru.split('\n').filter((line) => line.includes('action reset'));
    expect(resetLines).toHaveLength(3);
    expect(resetLines.every((line) => line.includes('karabiner-layer off'))).toBe(true);
    expect(setup).toContain('\".local/bin/karabiner-layer\"');
    expect(setup).toContain('\".config/neru/config.toml\"');
  });

});
