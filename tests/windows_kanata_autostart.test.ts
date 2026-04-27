import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Windows Kanata autostart', () => {
  const autostartPath = path.resolve(__dirname, '../windows/kanata-autostart.ps1');
  const startPath = path.resolve(__dirname, '../windows/kanata-start.ps1');

  it('provides Kanata autostart scripts', () => {
    expect(fs.existsSync(autostartPath)).toBe(true);
    expect(fs.existsSync(startPath)).toBe(true);
  });

  it('registers a logon scheduled task with highest privileges', () => {
    const content = fs.readFileSync(autostartPath, 'utf-8');
    expect(content).toContain('BuiltBy Kanata');
    expect(content).toContain('New-ScheduledTaskTrigger -AtLogOn');
    expect(content).toContain('Register-ScheduledTask');
    expect(content).toContain('RunLevel Highest');
    expect(content).toContain('Unregister-ScheduledTask');
  });

  it('keeps the param block before executable statements', () => {
    const lines = fs.readFileSync(autostartPath, 'utf-8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    expect(lines[0]).toBe('param(');
  });

  it('starts Kanata with the shared config', () => {
    const content = fs.readFileSync(startPath, 'utf-8');
    expect(content).toContain('.config/kanata/kanata.kbd');
    expect(content).toContain('--cfg');
  });
});
