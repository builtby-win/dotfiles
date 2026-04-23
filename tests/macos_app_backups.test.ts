import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('macOS app backup organization', () => {
  const readmePath = path.resolve(__dirname, '../README.md');
  const setupPath = path.resolve(__dirname, '../setup.ts');
  const functionsPath = path.resolve(__dirname, '../shell/functions.sh');
  const restoreScriptPath = path.resolve(__dirname, '../scripts/restore-macos-app-backups.sh');
  const docsPath = path.resolve(__dirname, '../docs/modules/app-backups.md');
  const chezmoiDocPath = path.resolve(__dirname, '../docs/modules/chezmoi.md');

  it('stores app exports under stable asset paths', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../assets/app-exports/raycast/archive/Raycast-2026-04-22-23-03-14.rayconfig'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../assets/app-exports/rectangle-pro/RectangleProConfig.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../assets/app-exports/bettertouchtool/Default.bttpreset'))).toBe(true);
  });

  it('documents app backup restore helpers in the README', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('bb restore macos-apps');
    expect(content).toContain('assets/app-exports/');
    expect(content).not.toContain('| Mackup | `bb setup mackup`');
  });

  it('removes Mackup from the interactive config catalog', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');
    expect(content).not.toContain('{ name: "Mackup", value: "mackup"');
    expect(content).not.toContain('mackup: [".mackup.cfg"]');
  });

  it('adds a restore helper command to shell functions', () => {
    const content = fs.readFileSync(functionsPath, 'utf-8');
    expect(content).toContain('bb restore <target>');
    expect(content).toContain('restore-macos-app-backups.sh');
    expect(content).toContain('raycast, rectangle-pro, bettertouchtool, macos-apps');
  });

  it('adds restore script and docs for app exports', () => {
    const restoreScript = fs.readFileSync(restoreScriptPath, 'utf-8');
    const docs = fs.readFileSync(docsPath, 'utf-8');
    const chezmoiDoc = fs.readFileSync(chezmoiDocPath, 'utf-8');

    expect(restoreScript).toContain('Revealing macOS app backup exports');
    expect(restoreScript).toContain('Raycast-2026-04-22-23-03-14.rayconfig');
    expect(docs).toContain('Default.bttpreset');
    expect(chezmoiDoc).toContain('real chezmoi-first bootstrap lane');
  });
});
