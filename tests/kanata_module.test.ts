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
  const kanataLayerPath = path.resolve(__dirname, '../chezmoi/dot_local/bin/executable_kanata-layer');

  function getActiveChords(content: string): string[] {
    const lines = content.split(/\r?\n/);
    const active: string[] = [];
    let inDefchordsv2 = false;

    for (const rawLine of lines) {
      const line = rawLine.split(';;')[0].trim();

      if (!inDefchordsv2) {
        if (line.startsWith('(defchordsv2')) {
          inDefchordsv2 = true;
        }

        continue;
      }

      if (line === ')') {
        inDefchordsv2 = false;
        continue;
      }

      if (line) {
        active.push(line);
      }
    }

    return active;
  }

  it('provides managed Kanata configs', () => {
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(chezmoiConfigPath)).toBe(true);
    expect(fs.existsSync(sculptConfigPath)).toBe(true);
    expect(fs.readFileSync(chezmoiConfigPath, 'utf-8')).toBe(fs.readFileSync(configPath, 'utf-8'));
  });

  it('provides filtered macOS Kanata profiles', () => {
    const content = fs.readFileSync(configPath, 'utf-8');
    const sculpt = fs.readFileSync(sculptConfigPath, 'utf-8');
    const defsrc = 'lctl lsft lalt lmet ralt rmet rctl rsft menu caps fn del ; tab grv esc spc h j k l u d a e w b f c v x z q m r t y i o p s g n 4 f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12';
    const nonSculptBase = '@os-ctl @os-sft @os-alt @os-cmd @hyper-key @os-rcmd @os-rctl @os-rsft @hyper-key @cap @fn esc @semi tab grv esc spc h @editor-j k l u d a e w b f c v x z q m r t y i o p s g n 4 brdn brup mctl lpad bldn blup prev pp next mute voldwn volu';
    const sculptBase = '@os-ctl @os-sft @os-cmd @os-alt @os-rcmd @os-rcmd @os-rctl @os-rsft @hyper-key @cap @fn esc @semi tab grv esc spc h @editor-j k l u d a e w b f c v x z q m r t y i o p s g n 4 brdn brup mctl lpad bldn blup prev pp next mute voldwn volu';
    const hyperlayer = '_ _ _ _ _ _ _ _ _ _ _ _ _ C-A-S-M-tab C-A-S-M-grv C-A-S-M-esc C-A-S-M-spc C-A-S-M-h C-A-S-M-j C-A-S-M-k C-A-S-M-l C-A-S-M-u C-A-S-M-d C-A-S-M-a C-A-S-M-e C-A-S-M-w C-A-S-M-b C-A-S-M-f C-A-S-M-c C-A-S-M-v C-A-S-M-x C-A-S-M-z C-A-S-M-q C-A-S-M-m C-A-S-M-r C-A-S-M-t C-A-S-M-y C-A-S-M-i C-A-S-M-o C-A-S-M-p C-A-S-M-s C-A-S-M-g C-A-S-M-n C-A-S-M-4 C-A-S-M-f1 C-A-S-M-f2 C-A-S-M-f3 C-A-S-M-f4 C-A-S-M-f5 C-A-S-M-f6 C-A-S-M-f7 C-A-S-M-f8 C-A-S-M-f9 C-A-S-M-f10 C-A-S-M-f11 C-A-S-M-f12';
    const cmdRow = '_ _ _ _ _ _ _ _ _ _ _ _ _ M-tab M-grv _ _ M-h M-j M-k M-l M-u M-d M-a M-e M-w M-b M-f M-c M-v M-x M-z M-q M-m M-r M-t M-y M-i M-o M-p M-s M-g M-n _ _ _ _ _ _ _ _ _ _ _ _ _';
    const fnRow = '_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12';

    expect(content).toContain('(defsrc');
    expect(content).toContain('macos-dev-names-exclude');
    expect(content).toContain('0xCB1EB82FC081667C');
    expect(content).toContain('Karabiner DriverKit VirtualHIDKeyboard 1.8.0');
    expect(content).toContain('0x2E7E3EBD4C615B55');
    expect(sculpt).toContain('macos-dev-names-include');
    expect(sculpt).toContain('0xCB1EB82FC081667C');
    expect(sculpt).not.toContain('Karabiner DriverKit VirtualHIDKeyboard 1.8.0');
    expect(content).toContain(defsrc);
    expect(sculpt).toContain(defsrc);
    expect(content).toContain('hyper (multi lctl lalt lsft lmet reverse-release-order)');
    expect(content).toContain('os-ctl (one-shot-press-pcancel 1000 lctl)');
    expect(content).toContain('os-sft (one-shot-press-pcancel 1000 lsft)');
    expect(content).toContain('os-alt (one-shot-press-pcancel 1000 lalt)');
    expect(content).toContain('os-cmd (one-shot-press-pcancel 1000 lmet)');
    expect(content).toContain('os-rctl (one-shot-press-pcancel 1000 rctl)');
    expect(content).toContain('os-rsft (one-shot-press-pcancel 1000 rsft)');
    expect(content).toContain('os-ralt (one-shot-press-pcancel 1000 ralt)');
    expect(content).toContain('os-rcmd (one-shot-press-pcancel 1000 rmet)');
    expect(content).toContain('hyper-next (one-shot-press-pcancel 2000 C-A-S-lmet)');
    expect(sculpt).toContain('hyper-next (one-shot-press-pcancel 2000 C-A-S-lmet)');
    expect(content).toContain('hyper-key (tap-hold 200 200 @hyper-next @hyper)');
    expect(sculpt).toContain('hyper-key (tap-hold 200 200 @hyper-next @hyper)');
    expect(content).toContain('cap (tap-hold 200 200 esc lctl)');
    expect(content).toContain('fn (tap-hold 200 200 lctl (layer-while-held fn))');
    expect(content).toContain('semi (tap-dance 200 (; (macro C-A-tab)))');
    expect(content).toContain('j-home (tap-hold-tap-keys 200 200 j (layer-while-held jheld) (y u i o p h j k l ; n m , . /))');
    expect(sculpt).toContain('j-home (tap-hold-tap-keys 200 200 j (layer-while-held jheld) (y u i o p h j k l ; n m , . /))');
    expect(content).toContain('bksp-repeat (macro-repeat-release-cancel bspc 85)');
    expect(sculpt).toContain('bksp-repeat (macro-repeat-release-cancel bspc 85)');
    expect(content).toContain('nav-layer (layer-while-held nav)');
    expect(content).toContain('mouse-layer (layer-while-held mouse)');
    expect(content).toContain('mm-up (movemouse-accel-up 1 1000 1 5)');
    expect(content).toContain('mw-right (mwheel-right 50 120)');
    expect(content).toContain('deflayer hyperlayer');
    expect(content).toContain(hyperlayer);
    expect(content).toContain('C-A-S-M-spc');
    expect(content).toContain('C-A-S-M-r');
    expect(content).toContain('C-A-S-M-t');
    expect(content).toContain('C-A-S-M-n');
    expect(content).toContain('C-A-S-M-4');
    expect(sculpt).toContain('deflayer hyperlayer');
    expect(sculpt).toContain(hyperlayer);
    expect(sculpt).toContain('C-A-S-M-spc');
    expect(sculpt).toContain('C-A-S-M-r');
    expect(sculpt).toContain('C-A-S-M-t');
    expect(sculpt).toContain('C-A-S-M-n');
    expect(sculpt).toContain('C-A-S-M-4');
    expect(content).toContain('deflayermap (nav)');
    expect(content).toContain('deflayermap (mouse)');
    expect(content).toContain('deflayermap (jheld)');
    expect(content).toContain('spc @bksp-repeat');
    expect(sculpt).toContain('deflayermap (nav)');
    expect(sculpt).toContain('deflayermap (mouse)');
    expect(sculpt).toContain('deflayermap (jheld)');
    expect(content).toContain('(deflayer neruscroll');
    expect(sculpt).toContain('(deflayer neruscroll');
    expect(sculpt).toContain('spc @bksp-repeat');
    expect(content).toContain(nonSculptBase);
    expect(sculpt).toContain(sculptBase);
    expect(content).toContain(cmdRow);
    expect(sculpt).toContain(cmdRow);
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      expect(content).toContain(`M-${letter}`);
      expect(sculpt).toContain(`M-${letter}`);
    }
    expect(content).toContain(fnRow);
    expect(sculpt).toContain(fnRow);
    expect(content).toContain('com.mitchellh.ghostty nop0');
    expect(sculpt).toContain('com.mitchellh.ghostty nop0');
    expect(content).toContain('((input virtual com.github.wez.wezterm)) @leader break');
    expect(content).toContain('cmd-next (one-shot 2000 (layer-while-held cmd))');
    expect(sculpt).toContain('cmd-next (one-shot 2000 (layer-while-held cmd))');
    expect(content).toContain('() @cmd-next break');
    const requiredActiveChords = [
      '(j k) @jk 75 first-release (neruscroll)',
      '(d f) (macro C-A-S-M-f) 75 first-release ()',
      '(j l) @nav-layer 75 first-release (neruscroll)',
      '(l k) @hyper-next 75 first-release ()',
      '(k spc) @mouse-layer 75 first-release (neruscroll)',
      '(esc spc) XX 80 first-release ()',
    ];
    expect(content).toContain('(j k) @jk 75 first-release (neruscroll)');
    expect(sculpt).toContain('(j k) @jk 75 first-release (neruscroll)');
    expect(content).toContain('(d f) (macro C-A-S-M-f)');
    expect(content).toContain('(j l) @nav-layer 75 first-release (neruscroll)');
    expect(content).toContain('(l k) @hyper-next 75 first-release ()');
    expect(content).toContain('(k spc) @mouse-layer 75 first-release (neruscroll)');
    expect(content).toContain('(esc spc) XX 80 first-release ()');
    expect(sculpt).toContain('(j l) @nav-layer 75 first-release (neruscroll)');
    expect(sculpt).toContain('(l k) @hyper-next 75 first-release ()');
    expect(sculpt).toContain('(k spc) @mouse-layer 75 first-release (neruscroll)');
    expect(sculpt).toContain('(esc spc) XX 80 first-release ()');

    for (const chords of [getActiveChords(content), getActiveChords(sculpt)]) {
      for (const entry of requiredActiveChords) {
        expect(chords).toContain(entry);
      }

      expect(chords.some((entry) => entry.startsWith('(f j) '))).toBe(false);
      expect(chords.some((entry) => entry.startsWith('(j f) '))).toBe(false);
      expect(chords.some((entry) => entry.startsWith('(d k) '))).toBe(false);
      expect(chords.some((entry) => entry.startsWith('(k d) '))).toBe(false);
      expect(chords.some((entry) => entry.startsWith('(s l) '))).toBe(false);
      expect(chords.some((entry) => entry.startsWith('(l s) '))).toBe(false);
      expect(chords.some((entry) => entry.startsWith('(j spc) '))).toBe(false);
      expect(chords.some((entry) => entry.startsWith('(spc j) '))).toBe(false);
    }
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
    expect(helper).toContain('macOS may ask for your password');
    expect(helper).toContain('/Library/LaunchDaemons/${label}.plist');
    expect(helper).toContain('chown root:wheel');
    expect(helper).toContain('chmod 644');
    expect(helper).toContain('launchctl enable system/$label');
    expect(helper).toContain("launchctl bootstrap system '$plist_path'");
    expect(helper).toContain('launchctl kickstart -k system/$label');
    expect(helper).toContain('launchctl kickstart -k "gui/$(id -u)/$label"');
    expect(helper).toContain('KANATA_TCP_PORT="5829"');
    expect(helper).toContain('KANATA_SCULPT_TCP_PORT="5830"');
    expect(helper).toContain('com.builtbywin.kanata-sculpt');
    expect(helper).toContain('com.builtbywin.kanata-other');
    expect(helper).toContain('local.kanata-vk-agent-other');
    expect(helper).toContain('local.kanata-vk-agent-sculpt');
    expect(helper).toContain('Stop legacy Kanata helpers');
    expect(helper).toContain('remove_legacy_launchdaemon');
    expect(helper).toContain('remove_legacy_vk_agent_launchagent');
    expect(helper).toContain("rm -f '$plist_path'");
    expect(helper).toContain('rm -f "$plist_path"');
    expect(helper).toContain('brew install kanata-vk-agent');
    expect(helper).toContain('$HOME/Library/LaunchAgents');
    expect(helper).toContain('local.kanata-vk-agent');
    expect(helper).toContain('local.microsoft-sculpt-hidutil');
    expect(helper).toContain('Karabiner-DriverKit-VirtualHIDDevice');
    expect(helper).toContain('IOHIDDeviceOpen.*not permitted');
    expect(helper).toContain('Next restart/login check:');
    expect(helper).toContain('launchctl print system/$PLIST_LABEL');
    expect(helper).toContain('launchctl print gui/$(id -u)/$VK_AGENT_LABEL');
    expect(helper).toContain('bb kanata-setup');
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

  it('provides a layer status helper for both Kanata daemons', () => {
    const helper = fs.readFileSync(kanataLayerPath, 'utf-8');

    expect(helper).toContain('PORTS = (5829, 5830)');
    expect(helper).toContain('def current_layer(port: int)');
    expect(helper).toContain('usage: kanata-layer <layer|status>');
    expect(helper).toContain('action = current_layer if layer == "status"');
    expect(helper).toContain('return 0 if all(ok for ok, _ in results) else 1');
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
