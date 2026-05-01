import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Kanata module', () => {
  const configPath = path.resolve(__dirname, '../chezmoi/dot_config/kanata/kanata.kbd');
  const chezmoiConfigPath = path.resolve(__dirname, '../chezmoi/dot_config/kanata/kanata.kbd');
  const sculptConfigPath = path.resolve(__dirname, '../chezmoi/dot_config/kanata/kanata-sculpt.kbd');
  const docsPath = path.resolve(__dirname, '../docs/modules/kanata.md');
  const setupPath = path.resolve(__dirname, '../setup.ts');
  const macosInstallerPath = path.resolve(__dirname, '../scripts/install-kanata-macos.sh');
  const macosSetupPath = path.resolve(__dirname, '../scripts/setup-kanata-macos.sh');
  const shellFunctionsPath = path.resolve(__dirname, '../shell/functions.sh');

  it('provides managed Kanata configs', () => {
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(chezmoiConfigPath)).toBe(true);
    expect(fs.existsSync(sculptConfigPath)).toBe(true);
    expect(fs.readFileSync(chezmoiConfigPath, 'utf-8')).toBe(fs.readFileSync(configPath, 'utf-8'));
  });

  it('provides filtered macOS Kanata profiles', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    const sculpt = fs.readFileSync(sculptConfigPath, 'utf-8');

    expect(content).toContain('(defsrc');
    expect(content).toContain('macos-dev-names-exclude');
    expect(content).toContain('0xCB1EB82FC081667C');
    expect(sculpt).toContain('macos-dev-names-include');
    expect(sculpt).toContain('0xCB1EB82FC081667C');
    expect(content).toContain('lalt lmet ralt rmet menu caps fn del ; j k d f tab grv a c v x z w q f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12');
    expect(sculpt).toContain('lalt lmet ralt rmet menu caps fn del ; j k d f tab grv a c v x z w q f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12');
    expect(content).toContain('hyper (multi lctl lalt lsft lmet reverse-release-order)');
    expect(content).toContain('cap (tap-hold 200 200 esc lctl)');
    expect(content).toContain('fn (tap-hold 200 200 lctl (layer-while-held fn))');
    expect(content).toContain('semi (tap-dance 200 (; (macro C-A-tab)))');
    expect(content).toContain('lalt lmet @hyper rmet @hyper @cap @fn esc @semi j k d f tab grv a c v x z w q brdn brup mctl lpad bldn blup prev pp next mute voldwn volu');
    expect(sculpt).toContain('lmet lalt rmet rmet @hyper @cap @fn esc @semi j k d f tab grv a c v x z w q brdn brup mctl lpad bldn blup prev pp next mute voldwn volu');
    expect(content).toContain('com.mitchellh.ghostty nop0');
    expect(sculpt).toContain('com.mitchellh.ghostty nop0');
    expect(content).toContain('((input virtual com.github.wez.wezterm)) @leader break');
    expect(content).toContain('cmd-next (one-shot 2000 (layer-while-held cmd))');
    expect(sculpt).toContain('cmd-next (one-shot 2000 (layer-while-held cmd))');
    expect(content).toContain('() @cmd-next break');
    expect(content).toContain('(j k) @jk');
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
    expect(helper).toContain('/Library/LaunchDaemons/${label}.plist');
    expect(helper).toContain('KANATA_TCP_PORT="5829"');
    expect(helper).toContain('KANATA_SCULPT_TCP_PORT="5830"');
    expect(helper).toContain('com.builtbywin.kanata-sculpt');
    expect(helper).toContain('com.builtbywin.kanata-other');
    expect(helper).toContain('local.kanata-vk-agent-other');
    expect(helper).toContain('local.kanata-vk-agent-sculpt');
    expect(helper).toContain('Stop legacy Kanata helpers');
    expect(helper).toContain('brew install kanata-vk-agent');
    expect(helper).toContain('$HOME/Library/LaunchAgents');
    expect(helper).toContain('local.kanata-vk-agent');
    expect(helper).toContain('local.microsoft-sculpt-hidutil');
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
    expect(content).toContain('two filtered macOS Kanata profiles');
    expect(content).toContain('kanata-sculpt.kbd');
    expect(content).toContain('0xCB1EB82FC081667C');
    expect(content).toContain('Right Option -> Right Command');
    expect(content).toContain('failed `hidutil` approach');
    expect(content).toContain('kanata-vk-agent');
    expect(content).toContain('terminal virtual key pressed: send `Ctrl+b`');
    expect(content).toContain('AutoHotkey only for Windows-only gaps');
    expect(content).toContain('bb kanata-setup');
  });

  it('offers Kanata in local setup as an app and managed config', () => {
    const setupTs = fs.readFileSync(setupPath, 'utf-8');

    expect(setupTs).toContain('{ name: "Kanata", value: "kanata", brewName: ""');
    expect(setupTs).toContain('".config/kanata/kanata.kbd"');
    expect(setupTs).toContain('".config/kanata/kanata-sculpt.kbd"');
    expect(setupTs).toContain('cargo install kanata --features cmd');
    expect(setupTs).toContain('"scripts", "install-kanata-macos.sh"');
    expect(setupTs).toContain('{ name: "Kanata", value: "kanata", checked: true');
  });
});
