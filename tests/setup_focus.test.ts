import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const setupPath = path.resolve(__dirname, '../setup.ts');
const bootstrapPath = path.resolve(__dirname, '../bootstrap.sh');
const linuxBootstrapPath = path.resolve(__dirname, '../bootstrap-linux.sh');
const functionsPath = path.resolve(__dirname, '../shell/functions.sh');

describe('focused setup defaults', () => {
  it('defaults Claude Code into AI/dev setup without using Homebrew', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('{ name: "Claude Code", value: "claude", brewName: "", configs: ["claude"], checked: true');
    expect(content).toContain('platforms: { macos: true, linux: true, windows: false }, category: "ai"');
    expect(content).toContain('{ name: "gh", value: "gh", brewName: "gh", checked: true');
    expect(content).toContain('npm install -g @anthropic-ai/claude-code');
  });

  it('lets focused setup default to iTerm2 while keeping Ghostty optional', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('function selectFocusedWorkflowApps(');
    expect(content).toContain('Focused setup starts with the recommended AI/dev workflow selected. iTerm2 is the first terminal; Ghostty stays optional.');
    expect(content).toContain('checked: app.value !== "ghostty",');
    expect(content).toContain('selectedApps = await selectFocusedWorkflowApps(selectableApps, appStates, installItemLabel);');
    expect(content).toContain('let setupPath: SetupPathChoice | "use_detected" = bootstrapSetupPath ?? (isFocusFlag ? "focus" : "focus");');
    expect(content).toContain('message: "Use the recommended setup or keep what is already here?"');
    expect(content).toContain('default: "focus"');
    expect(content).not.toContain('selectedApps = ["back2vibing", "tmux", "sesh", "fzf", "ghostty", "starship", "zoxide"]');
  });

  it('runs setup directly instead of showing the old dashboard menu first', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('if (action === "menu")');
    expect(content).toContain('await runSetup();');
    expect(content).not.toContain('await mainMenu();\n  } catch');
  });

  it('supports explicit AI Agent setup path from bootstrap and bb helper', () => {
    const setupContent = fs.readFileSync(setupPath, 'utf-8');
    const macBootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
    const linuxBootstrap = fs.readFileSync(linuxBootstrapPath, 'utf-8');
    const functionsContent = fs.readFileSync(functionsPath, 'utf-8');

    expect(setupContent).toContain('"customize" | "ai_agent"');
    expect(macBootstrap).toContain('focus|standard|minimal|customize|ai_agent');
    expect(linuxBootstrap).toContain('focus|standard|minimal|customize|ai_agent');
    expect(functionsContent).toContain('pnpm exec tsx setup.ts "$dotfiles_dir" "$@"');
  });
});
