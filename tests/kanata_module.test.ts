import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Kanata module', () => {
  const configPath = path.resolve(__dirname, '../chezmoi/dot_config/kanata/kanata.kbd');
  const chezmoiConfigPath = path.resolve(__dirname, '../chezmoi/dot_config/kanata/kanata.kbd');
  const docsPath = path.resolve(__dirname, '../docs/modules/kanata.md');
  const setupPath = path.resolve(__dirname, '../setup.ts');
  const macosInstallerPath = path.resolve(__dirname, '../scripts/install-kanata-macos.sh');
  const macosSetupPath = path.resolve(__dirname, '../scripts/setup-kanata-macos.sh');
  const shellFunctionsPath = path.resolve(__dirname, '../shell/functions.sh');

  it('provides a shared Kanata config', () => {
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(chezmoiConfigPath)).toBe(true);
    expect(fs.readFileSync(chezmoiConfigPath, 'utf-8')).toBe(fs.readFileSync(configPath, 'utf-8'));
  });

  it('maps Microsoft Sculpt keys to the Karabiner parity layer', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('(defsrc');
    expect(content).toContain('"0xCB1EB82FC081667C"');
    expect(content).toContain('lalt lmet ralt menu caps del ; j k d f');
    expect(content).toContain('hyper (multi lctl lalt lsft lmet reverse-release-order)');
    expect(content).toContain('cap (tap-hold 200 200 esc lctl)');
    expect(content).toContain('semi (tap-dance 200 (; (macro C-A-tab)))');
    expect(content).toContain('lmet lalt rmet @hyper @cap esc @semi j k d f');
    expect(content).toContain('(j k) (macro C-b)');
    expect(content).toContain('(d f) (macro C-A-S-M-f)');
  });

  it('documents the patched macOS Application key installer', () => {
    const installer = fs.readFileSync(macosInstallerPath, 'utf-8');
    const docs = fs.readFileSync(docsPath, 'utf-8');

    expect(installer).toContain('code: 0x65');
    expect(installer).toContain('Ok(OsCode::KEY_COMPOSE)');
    expect(docs).toContain('scripts/install-kanata-macos.sh');
    expect(docs).toContain('page: 7, code: 101');
  });

  it('provides a guided macOS setup helper for permissions and launchd', () => {
    const helper = fs.readFileSync(macosSetupPath, 'utf-8');
    const shellFunctions = fs.readFileSync(shellFunctionsPath, 'utf-8');
    const setupTs = fs.readFileSync(setupPath, 'utf-8');

    expect(helper).toContain('Privacy_ListenEvent');
    expect(helper).toContain('Privacy_Accessibility');
    expect(helper).toContain('/Library/LaunchDaemons/${PLIST_LABEL}.plist');
    expect(helper).toContain('Karabiner-DriverKit-VirtualHIDDevice');
    expect(helper).toContain('IOHIDDeviceOpen.*not permitted');
    expect(shellFunctions).toContain('bb kanata-setup');
    expect(setupTs).toContain('setup-kanata-macos.sh');
  });

  it('documents app-scope limitations', () => {
    const content = fs.readFileSync(docsPath, 'utf-8');
    expect(content).toContain('chezmoi/dot_config/kanata/kanata.kbd');
    expect(content).toContain('bb apply');
    expect(content).toContain('strict app-aware behavior');
    expect(content).toContain('AutoHotkey only for Windows-only gaps');
    expect(content).toContain('bb kanata-setup');
  });

  it('offers Kanata in local setup as an app and managed config', () => {
    const setupTs = fs.readFileSync(setupPath, 'utf-8');

    expect(setupTs).toContain('{ name: "Kanata", value: "kanata", brewName: ""');
    expect(setupTs).toContain('cargo install kanata --features cmd');
    expect(setupTs).toContain('"scripts", "install-kanata-macos.sh"');
    expect(setupTs).toContain('{ name: "Kanata", value: "kanata", checked: true');
  });
});
