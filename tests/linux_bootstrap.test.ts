import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Linux bootstrap workflow', () => {
  const bootstrapPath = path.resolve(__dirname, '../bootstrap.sh');
  const linuxBootstrapPath = path.resolve(__dirname, '../bootstrap-linux.sh');
  const readmePath = path.resolve(__dirname, '../README.md');
  const setupPath = path.resolve(__dirname, '../setup.ts');

  it('has a dedicated Linux bootstrap script', () => {
    expect(fs.existsSync(linuxBootstrapPath)).toBe(true);
  });

  it('uses apt, dnf, and pacman in Linux bootstrap', () => {
    const content = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    expect(content).toContain('apt-get');
    expect(content).toContain('dnf');
    expect(content).toContain('pacman');
  });

  it('routes Linux installs through the Linux bootstrap script', () => {
    const content = fs.readFileSync(bootstrapPath, 'utf-8');
    expect(content).toContain('bootstrap-linux.sh');
    expect(content).toContain('linux');
  });

  it('documents a separate Linux install command', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('bootstrap-linux.sh');
  });

  it('uses Linux package manager logic in setup.ts', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).toContain('getLinuxPackageManager');
    expect(content).toContain('apt-get');
    expect(content).toContain('dnf');
    expect(content).toContain('pacman');
  });
});
