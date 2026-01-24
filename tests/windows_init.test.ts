import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows PowerShell Core Integrations (init.ps1)', () => {
  const initPath = path.resolve(__dirname, '../windows/profile/init.ps1');

  it('should exist', () => {
    expect(fs.existsSync(initPath)).toBe(true);
  });

  it('should initialize Starship', () => {
    const content = fs.readFileSync(initPath, 'utf-8');
    expect(content).toContain('starship init powershell');
    expect(content).toContain('Invoke-Expression');
  });

  it('should initialize Zoxide', () => {
    const content = fs.readFileSync(initPath, 'utf-8');
    expect(content).toContain('zoxide init powershell');
    expect(content).toContain('Invoke-Expression');
  });

  it('should initialize Fnm', () => {
    const content = fs.readFileSync(initPath, 'utf-8');
    expect(content).toContain('fnm env --use-on-cd');
    expect(content).toContain('Invoke-Expression');
  });
});
