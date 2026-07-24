import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const setupPath = path.resolve(__dirname, '../setup.ts');
const bootstrapPath = path.resolve(__dirname, '../bootstrap.sh');
const linuxBootstrapPath = path.resolve(__dirname, '../bootstrap-linux.sh');
const functionsPath = path.resolve(__dirname, '../shell/functions.sh');

describe('focused setup defaults', () => {
  it('defaults Claude Code and OpenCode into AI/dev setup while keeping Codex optional', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('{ name: "Claude Code", value: "claude", brewName: "", configs: ["claude"], checked: true');
    expect(content).toContain('{ name: "OpenCode", value: "opencode", brewName: "", configs: ["opencode"], checked: true');
    expect(content).toContain('{ name: "Codex CLI", value: "codex", brewName: "", configs: ["codex"], checked: false');
    expect(content).toContain('platforms: { macos: true, linux: true, windows: false }, category: "ai"');
    expect(content).toContain('{ name: "gh", value: "gh", brewName: "gh", checked: true');
    expect(content).toContain('npm install -g @anthropic-ai/claude-code');
    expect(content).toContain('Installing OpenCode CLI...');
    expect(content).toContain('Installing Codex CLI...');
  });

  it('offers Oh My Pi, Herdr, and Conductor through supported installers', () => {
    const setup = fs.readFileSync(setupPath, 'utf-8');
    const brewfile = fs.readFileSync(path.resolve(__dirname, '../apps/Brewfile'), 'utf-8');
    const windowsSetup = fs.readFileSync(path.resolve(__dirname, '../setup-windows.ts'), 'utf-8');

    expect(setup).toContain('installCommand: "curl -fsSL https://omp.sh/install | sh"');
    expect(setup).toContain('{ name: "Herdr", value: "herdr", brewName: "herdr"');
    expect(setup).toContain('{ name: "Conductor", value: "conductor", brewName: "conductor", cask: true');
    expect(brewfile).toContain('brew "herdr"');
    expect(brewfile).toContain('cask "conductor"');
    expect(windowsSetup).toContain('irm https://omp.sh/install.ps1 | iex');
  });

  it('lets focused setup use recommended defaults while keeping Codex and Ghostty optional', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('function selectFocusedWorkflowApps(');
    expect(content).toContain('Focused setup starts with the recommended AI/dev workflow selected, including OpenCode. Codex and Ghostty stay optional.');
    expect(content).toContain('checked: state !== "not_installed" || (app.checked ?? false),');
    expect(content).toContain('selectedApps = await selectFocusedWorkflowApps(selectableApps, appStates, installItemLabel);');
    expect(content).toContain('let setupPath: SetupPathChoice | "use_detected" = bootstrapSetupPath ?? (isFocusFlag ? "focus" : "focus");');
    expect(content).toContain('message: "Use the recommended setup or keep what is already here?"');
    expect(content).toContain('default: "focus"');
    expect(content).not.toContain('selectedApps = ["back2vibing", "tmux", "sesh", "fzf", "ghostty", "starship", "zoxide"]');
  });

  it('shows every app individually under visible group headings', () => {
    const content = fs.readFileSync(setupPath, 'utf-8');

    expect(content).toContain('Show every app, grouped visually');
    expect(content).toContain('groups are shown as headings');
    expect(content).toContain('app.desc');
    expect(content).toContain('app.url');
    expect(content).toContain('selectedApps = selectedApps.filter((app) => !app.startsWith("__category_"));');
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
