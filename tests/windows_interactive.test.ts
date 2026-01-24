import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows Interactive Setup (setup-windows.ts)', () => {
  const setupPath = path.resolve(__dirname, '../setup-windows.ts');

  it('should exist', () => {
    expect(fs.existsSync(setupPath)).toBe(true);
  });

  it('should invoke windows/install.ps1', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    // We expect it to try to execute our specific bootstrap script
    expect(content).toContain('windows/install.ps1');
  });

  it('should have interactive prompts', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    // Checking for inquirer/prompts usage
    expect(content).toContain('@inquirer/prompts');
  });
});
