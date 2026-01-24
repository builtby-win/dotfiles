import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows PowerShell Profile', () => {
  const profileDir = path.resolve(__dirname, '../windows/profile');

  it('should have an entry point script', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../windows/Microsoft.PowerShell_profile.ps1'))).toBe(true);
  });

  it('should have windows/profile/init.ps1', () => {
    expect(fs.existsSync(path.join(profileDir, 'init.ps1'))).toBe(true);
  });

  it('should have windows/profile/aliases.ps1', () => {
    expect(fs.existsSync(path.join(profileDir, 'aliases.ps1'))).toBe(true);
  });

  it('should have windows/profile/functions.ps1', () => {
    expect(fs.existsSync(path.join(profileDir, 'functions.ps1'))).toBe(true);
  });

  it('entry point should source profile scripts', () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../windows/Microsoft.PowerShell_profile.ps1'), 'utf-8');
    expect(content).toContain('profile/init.ps1');
    expect(content).toContain('profile/aliases.ps1');
    expect(content).toContain('profile/functions.ps1');
  });
});
