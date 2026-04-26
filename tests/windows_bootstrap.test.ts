import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows Bootstrap Script (install.ps1)', () => {
  const scriptPath = path.resolve(__dirname, '../windows/install.ps1');
  const bootstrapPath = path.resolve(__dirname, '../bootstrap.ps1');

  it('should exist', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('should contain winget check logic', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('winget');
  });

  it('should contain git installation logic', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/git/i);
  });

  it('should contain repository cloning logic', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('dotfiles');
    expect(content).toContain('git clone');
  });

  it('should install packages from the Windows manifest', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('Install-PackageManifest');
    expect(content).toContain('windows/packages.json');
  });

  it('should link the PowerShell profile into the user profile path', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('$PROFILE.CurrentUserCurrentHost');
    expect(content).toContain('PowerShell/Microsoft.PowerShell_profile.ps1');
    expect(content).toContain('WindowsPowerShell/Microsoft.PowerShell_profile.ps1');
    expect(content).toContain('Microsoft.PowerShell_profile.ps1');
  });

  it('should add windows/bin to PATH for the bb command shim', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('Add-UserPath');
    expect(content).toContain('windows/bin');
  });

  it('top-level bootstrap should apply core setup before optional setup', () => {
    const content = fs.readFileSync(bootstrapPath, 'utf-8');
    expect(content).toContain('windows/install.ps1');
    expect(content).toContain('. (Join-Path $DotfilesDir "windows/install.ps1")');
    expect(content).toContain('setup-windows.ts --skip-core');
    expect(content).toContain('windows/bin/bb.ps1');
    expect(content).toContain('status');
  });
});
