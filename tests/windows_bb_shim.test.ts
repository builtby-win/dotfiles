import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows bb command shim', () => {
  const shimPath = path.resolve(__dirname, '../windows/bin/bb.ps1');
  const cmdPath = path.resolve(__dirname, '../windows/bin/bb.cmd');

  it('provides PATH-safe bb shims', () => {
    expect(fs.existsSync(shimPath)).toBe(true);
    expect(fs.existsSync(cmdPath)).toBe(true);
  });

  it('supports the main Windows helper commands', () => {
    const content = fs.readFileSync(shimPath, 'utf-8');
    expect(content).toContain('bb - dotfiles helper');
    expect(content).toContain('"update"');
    expect(content).toContain('"setup"');
    expect(content).toContain('"status"');
    expect(content).toContain('"kanata"');
    expect(content).toContain('"kanata-install"');
  });

  it('wraps bb.ps1 from bb.cmd', () => {
    const content = fs.readFileSync(cmdPath, 'utf-8');
    expect(content).toContain('bb.ps1');
    expect(content).toContain('ExecutionPolicy Bypass');
  });
});
