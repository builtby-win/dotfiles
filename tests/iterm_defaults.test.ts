import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('iTerm2 defaults', () => {
  const setupPath = path.resolve(__dirname, '../setup.ts');
  const functionsPath = path.resolve(__dirname, '../shell/functions.sh');
  const scriptPath = path.resolve(__dirname, '../scripts/setup-iterm-defaults.sh');

  it('ships an idempotent defaults helper with shell editing key mappings', () => {
    const script = fs.readFileSync(scriptPath, 'utf-8');

    expect(script).toContain('com.googlecode.iterm2');
    expect(script).toContain('ITERM_DEFAULTS_DOMAIN');
    expect(script).toContain('0x7f-0x100000-0x33');
    expect(script).toContain('Text = "0x15"');
    expect(script).toContain('0x7f-0x80000-0x33');
    expect(script).toContain('Text = "0x17"');
    expect(script).toContain('Ctrl-A/E should move to the start/end of the prompt');
    expect(script).toContain('0x61-0x40000-0x0');
    expect(script).toContain('Text = "0x01"');
    expect(script).toContain('0x65-0x40000-0xe');
    expect(script).toContain('Text = "0x05"');
    expect(script).toContain('defaults delete "$DOMAIN" "GlobalKeyMap.${key}"');
  });

  it('exposes iTerm2 defaults through setup and bb', () => {
    const setup = fs.readFileSync(setupPath, 'utf-8');
    const functions = fs.readFileSync(functionsPath, 'utf-8');

    expect(setup).toContain('{ name: "iTerm2", value: "iterm2"');
    expect(setup).toContain('{ name: "Ghostty", value: "ghostty", brewName: "ghostty", cask: true, configs: ["ghostty"]');
    expect(setup).toContain('{ name: "iTerm2 defaults", value: "iterm2"');
    expect(setup).toContain('autoSelectedManagedConfigs');
    expect(setup).toContain('applyITermDefaults');
    expect(functions).toContain('bb setup iterm2');
    expect(functions).toContain('setup-iterm-defaults.sh');
  });
});
