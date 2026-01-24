import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows Directory Structure', () => {
  const baseDir = path.resolve(__dirname, '../windows');

  it('should have a windows directory', () => {
    expect(fs.existsSync(baseDir)).toBe(true);
  });

  it('should have windows/install.ps1', () => {
    expect(fs.existsSync(path.join(baseDir, 'install.ps1'))).toBe(true);
  });

  it('should have windows/packages.json', () => {
    expect(fs.existsSync(path.join(baseDir, 'packages.json'))).toBe(true);
  });

  it('should have a windows/profile directory', () => {
    const profileDir = path.join(baseDir, 'profile');
    expect(fs.existsSync(profileDir)).toBe(true);
    expect(fs.lstatSync(profileDir).isDirectory()).toBe(true);
  });
});
