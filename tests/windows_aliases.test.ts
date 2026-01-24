import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows PowerShell Aliases (aliases.ps1)', () => {
  const aliasesPath = path.resolve(__dirname, '../windows/profile/aliases.ps1');

  it('should exist', () => {
    expect(fs.existsSync(aliasesPath)).toBe(true);
  });

  it('should define ls function', () => {
    const content = fs.readFileSync(aliasesPath, 'utf-8');
    expect(content).toMatch(/function ls/i);
    expect(content).toContain('eza');
  });

  it('should define which function', () => {
    const content = fs.readFileSync(aliasesPath, 'utf-8');
    expect(content).toMatch(/function which/i);
    expect(content).toContain('Get-Command');
  });

  it('should map cat to bat', () => {
    const content = fs.readFileSync(aliasesPath, 'utf-8');
    expect(content).toMatch(/Set-Alias.*cat.*bat/i);
  });

  it('should map grep to rg', () => {
    const content = fs.readFileSync(aliasesPath, 'utf-8');
    expect(content).toMatch(/Set-Alias.*grep.*rg/i);
  });

  it('should map sudo to gsudo', () => {
    const content = fs.readFileSync(aliasesPath, 'utf-8');
    expect(content).toMatch(/Set-Alias.*sudo.*gsudo/i);
  });
});
