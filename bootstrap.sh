#!/bin/bash
set -e

if [[ "$(uname -s)" == "Linux" ]]; then
  SCRIPT_SOURCE="${BASH_SOURCE[0]:-$0}"
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" 2>/dev/null && pwd 2>/dev/null || true)"
  LINUX_BOOTSTRAP_PATH="$SCRIPT_DIR/bootstrap-linux.sh"

  if [[ -n "$SCRIPT_DIR" && -f "$LINUX_BOOTSTRAP_PATH" ]]; then
    exec bash "$LINUX_BOOTSTRAP_PATH" "$@"
  fi

  exec bash -c "$(curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap-linux.sh)"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  ╔═══════════════════════════════════════════╗"
  echo "  ║         builtby.win/dotfiles              ║"
  echo "  ╚═══════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_step() {
  echo -e "${BLUE}==>${NC} ${BOLD}$1${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_debug() {
  echo -e "${CYAN}[DEBUG]${NC} $1"
}

confirm_install_plan() {
  echo ""
  echo -e "${BOLD}Before anything changes, here is the plan:${NC}"
  echo "  1. Use this folder for the dotfiles repo: $DOTFILES_DIR"
  echo "  2. Verify Xcode Command Line Tools, then install or reuse Homebrew, Git, chezmoi, fnm, Node.js, and pnpm"
  echo "  3. Apply the base chezmoi-managed shell/config files"
  echo "  4. Open an interactive setup dashboard where you review optional apps and configs"
  echo ""
  echo -e "${BOLD}Safety:${NC} the setup dashboard backs up managed files before optional replacements."
  echo "You can later change selections or restore backups from: bb setup"
  echo ""
  read -r -p "Continue with this install? [Y/n] " confirm < /dev/tty || {
    print_error "Cannot read from terminal. Make sure you're running this script interactively."
    exit 1
  }
  case "$confirm" in
    ""|y|Y|yes|YES)
      ;;
    *)
      print_error "Aborted before making changes."
      exit 1
      ;;
  esac
}

ensure_xcode_command_line_tools() {
  if xcode-select -p >/dev/null 2>&1; then
    print_success "Xcode Command Line Tools already installed"
    return 0
  fi

  print_error "Xcode Command Line Tools are required before running this installer."
  print_warning "Run: xcode-select --install"
  print_warning "After the install finishes, rerun this bootstrap script."

  if [[ -r /dev/tty ]]; then
    echo ""
    read -r -p "Open the Xcode Command Line Tools installer now? [Y/n] " install_xcode_tools < /dev/tty || install_xcode_tools="n"
    case "$install_xcode_tools" in
      ""|y|Y|yes|YES)
        xcode-select --install >/dev/null 2>&1 || true
        ;;
    esac
  fi

  exit 1
}

resolve_brew_bin() {
  if [[ -x "/opt/homebrew/bin/brew" ]]; then
    echo "/opt/homebrew/bin/brew"
    return 0
  fi

  if [[ -x "/usr/local/bin/brew" ]]; then
    echo "/usr/local/bin/brew"
    return 0
  fi

  if command -v brew &> /dev/null; then
    command -v brew
    return 0
  fi

  return 1
}

add_brew_to_session_path() {
  local brew_bin="$1"
  local brew_prefix=""

  brew_prefix="$($brew_bin --prefix 2>/dev/null || true)"
  if [[ -z "$brew_prefix" ]]; then
    return 0
  fi

  if [[ ":$PATH:" != *":$brew_prefix/bin:"* ]]; then
    export PATH="$brew_prefix/bin:$PATH"
  fi

  if [[ -d "$brew_prefix/sbin" && ":$PATH:" != *":$brew_prefix/sbin:"* ]]; then
    export PATH="$brew_prefix/sbin:$PATH"
  fi
}

print_brew_shellenv_instructions() {
  local brew_bin="$1"
  local shellenv_cmd=""

  print_warning "Homebrew is installed, but your shell may not be configured for it yet."
  echo "  Run these commands yourself if brew is missing in new terminals:"

  if [[ "$brew_bin" == "/opt/homebrew/bin/brew" ]]; then
    shellenv_cmd='$(/opt/homebrew/bin/brew shellenv)'
  else
    shellenv_cmd='$(/usr/local/bin/brew shellenv)'
  fi

  echo "    echo 'eval \"$shellenv_cmd\"' >> ~/.zprofile"
  echo "    eval \"$shellenv_cmd\""
}

setup_node_tool_paths() {
  export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
  mkdir -p "$HOME/.local/bin" "$PNPM_HOME"
  export PATH="$HOME/.local/bin:$PNPM_HOME:$PATH"
}

ensure_pnpm_available() {
  setup_node_tool_paths

  if command -v pnpm &> /dev/null; then
    return 0
  fi

  if command -v corepack &> /dev/null; then
    corepack enable --install-directory "$HOME/.local/bin" 2>/dev/null || true
    corepack prepare pnpm@10.28.2 --activate 2>/dev/null || true
  fi

  if command -v pnpm &> /dev/null; then
    return 0
  fi

  if command -v npm &> /dev/null; then
    npm install --global --prefix "$HOME/.local" pnpm@10.28.2 || true
  fi

  command -v pnpm &> /dev/null
}

install_project_dependencies() {
  if ensure_pnpm_available; then
    pnpm install --silent && return 0
  fi

  return 1
}

prompt_shell_refresh() {
  if [[ ! -r /dev/tty || -z "${SHELL:-}" || ! -x "$SHELL" ]]; then
    print_warning "Open a new terminal or run exec \"\$SHELL\" -l to refresh your PATH."
    return 0
  fi

  echo ""
  echo -e "${BOLD}Refresh your shell now?${NC} This loads the updated dotfiles and PATH."
  read -r -p "Run exec \"\$SHELL\" -l now? [y/N] " refresh_shell < /dev/tty || return 0
  case "$refresh_shell" in
    y|Y|yes|YES)
      exec "$SHELL" -l
      ;;
    *)
      print_warning "Open a new terminal or run exec \"\$SHELL\" -l when you are ready."
      ;;
  esac
}

# Check if running from curl pipe or locally
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" 2>/dev/null)" && pwd 2>/dev/null || echo "")"
REPO_URL="https://github.com/builtby-win/dotfiles.git"
SETUP_PATH=""
FORWARDED_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --focus)
      SETUP_PATH="focus"
      FORWARDED_ARGS+=("$1")
      shift
      ;;
    --setup-path)
      shift
      case "$1" in
        focus|standard|minimal|customize)
          SETUP_PATH="$1"
          ;;
        *)
          print_error "Unknown setup path: $1"
          exit 1
          ;;
      esac
      shift
      ;;
    *)
      FORWARDED_ARGS+=("$1")
      shift
      ;;
  esac
done

print_banner

ensure_xcode_command_line_tools

# Ask for install location
echo -e "Where should we install the dotfiles? ${CYAN}(press enter for ~/dotfiles)${NC}"
read -r -p "> " DOTFILES_DIR < /dev/tty || {
  print_error "Cannot read from terminal. Make sure you're running this script interactively."
  exit 1
}
DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
DOTFILES_DIR="${DOTFILES_DIR/#\~/$HOME}"
print_debug "Install directory: $DOTFILES_DIR"

confirm_install_plan

# Create directory if it doesn't exist
if ! mkdir -p "$DOTFILES_DIR" 2>/dev/null; then
  print_error "Failed to create directory: $DOTFILES_DIR"
  print_error "Check permissions or disk space"
  exit 1
fi
print_debug "Directory ready: $DOTFILES_DIR"

echo ""

# Ensure Git is installed
print_debug "Checking for git..."
if ! command -v git &> /dev/null; then
  print_step "Git not found. Attempting to install..."
  print_debug "OSTYPE: $OSTYPE"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    BREW_BIN="$(resolve_brew_bin || true)"
    if [[ -n "$BREW_BIN" ]]; then
      add_brew_to_session_path "$BREW_BIN"
      print_step "Installing Git via Homebrew..."
      "$BREW_BIN" install git
    else
      print_warning "Git is required. A dialog may appear to install Xcode Command Line Tools."
      print_warning "If not, run: xcode-select --install"
      # This usually triggers the OS prompt
      git --version || true
      print_error "Please install Git/Xcode Tools and run this script again."
      exit 1
    fi
  elif [ -f /etc/debian_version ]; then
    print_step "Installing Git via apt..."
    sudo apt-get update && sudo apt-get install -y git
  elif [ -f /etc/arch-release ]; then
    print_step "Installing Git via pacman..."
    sudo pacman -S --noconfirm git
  elif [ -f /etc/fedora-release ]; then
    print_step "Installing Git via dnf..."
    sudo dnf install -y git
  else
    print_error "Could not install Git automatically. Please install Git and run this script again."
    exit 1
  fi
  
  if ! command -v git &> /dev/null; then
    print_error "Git installation failed. Please install manually."
    exit 1
  fi
  print_success "Git installed"
fi

# Clone or update repo
print_debug "Checking if dotfiles already exist at $DOTFILES_DIR"
if [ -d "$DOTFILES_DIR/.git" ]; then
  print_step "Updating existing dotfiles..."
  print_debug "Git repo found, pulling latest..."
  cd "$DOTFILES_DIR" || { print_error "Failed to cd into $DOTFILES_DIR"; exit 1; }
  git pull --rebase || { print_error "git pull failed"; exit 1; }
  print_success "Dotfiles updated"
elif [ -d "$DOTFILES_DIR" ] && [ "$(ls -A "$DOTFILES_DIR")" ]; then
  print_warning "Directory $DOTFILES_DIR exists and is not empty"
  print_debug "Contents found in $DOTFILES_DIR"
  echo -e "  ${CYAN}[b]${NC}ackup & continue | ${CYAN}[c]${NC}ontinue anyway | ${CYAN}[q]${NC}uit"
  read -r -p "  > " choice < /dev/tty || {
    print_error "Cannot read from terminal"
    exit 1
  }
  case "$choice" in
    b|B)
      backup_dir="${DOTFILES_DIR}.backup.$(date +%Y%m%d%H%M%S)"
      print_debug "Backing up to: $backup_dir"
      mv "$DOTFILES_DIR" "$backup_dir" || { print_error "Failed to backup directory"; exit 1; }
      print_success "Backed up to $backup_dir"
      print_debug "Cloning from $REPO_URL"
      git clone "$REPO_URL" "$DOTFILES_DIR" || { print_error "git clone failed"; exit 1; }
      ;;
    c|C)
      print_warning "Continuing with existing directory"
      ;;
    *)
      print_error "Aborted."
      exit 1
      ;;
  esac
elif [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/setup.ts" ]; then
  # Running locally from the repo
  DOTFILES_DIR="$SCRIPT_DIR"
  print_debug "Detected local repo at: $SCRIPT_DIR"
  print_success "Using local dotfiles at $DOTFILES_DIR"
else
  print_step "Cloning dotfiles..."
  print_debug "Cloning from $REPO_URL to $DOTFILES_DIR"
  git clone "$REPO_URL" "$DOTFILES_DIR" || { print_error "git clone failed"; exit 1; }
  print_success "Cloned to $DOTFILES_DIR"
fi

print_debug "Changing to directory: $DOTFILES_DIR"
cd "$DOTFILES_DIR" || { print_error "Failed to cd into $DOTFILES_DIR"; exit 1; }

echo ""
print_step "[1/4] Preparing required installer tools..."

# Install Homebrew if not present
print_debug "Checking for homebrew..."
BREW_BIN="$(resolve_brew_bin || true)"
if [[ -z "$BREW_BIN" ]]; then
  echo "  Installing Homebrew..."
  print_debug "Downloading Homebrew installer..."
  if /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" 2>&1; then
    print_debug "Homebrew installed successfully"
  else
    print_error "Homebrew installation failed"
    exit 1
  fi

  BREW_BIN="$(resolve_brew_bin || true)"
  if [[ -z "$BREW_BIN" ]]; then
    print_error "Homebrew was installed, but brew is still not available"
    exit 1
  fi

  add_brew_to_session_path "$BREW_BIN"
  print_brew_shellenv_instructions "$BREW_BIN"
  print_success "Homebrew installed"
else
  add_brew_to_session_path "$BREW_BIN"
  if ! command -v brew &> /dev/null; then
    print_brew_shellenv_instructions "$BREW_BIN"
  fi
  print_success "Homebrew already installed"
fi

# Install chezmoi
print_debug "Checking for chezmoi..."
if ! command -v chezmoi &> /dev/null; then
  echo "  Installing chezmoi..."
  "$BREW_BIN" install chezmoi || { print_error "Failed to install chezmoi"; exit 1; }
  add_brew_to_session_path "$BREW_BIN"
  print_success "chezmoi installed"
else
  print_success "chezmoi already installed"
fi

# Install fnm (Fast Node Manager)
print_debug "Checking for fnm..."
if ! command -v fnm &> /dev/null; then
  echo "  Installing fnm (Node version manager)..."
  "$BREW_BIN" install fnm || { print_error "Failed to install fnm"; exit 1; }
  add_brew_to_session_path "$BREW_BIN"

  # Setup fnm for this session
  print_debug "Setting up fnm environment..."
  eval "$(fnm env --use-on-cd)" || print_warning "Failed to initialize fnm"
  print_success "fnm installed"
else
  print_debug "Initializing fnm environment..."
  eval "$(fnm env --use-on-cd)" 2>/dev/null || print_warning "Failed to initialize fnm"
  print_success "fnm already installed"
fi

# Install Node.js via fnm
print_debug "Checking for Node.js..."
if command -v fnm &> /dev/null; then
  echo "  Ensuring Node.js LTS is configured via fnm..."
  print_debug "Installing and selecting Node.js LTS..."
  fnm install --lts || { print_error "Failed to install Node.js LTS"; exit 1; }
  fnm default lts-latest || { print_error "Failed to set default Node.js LTS"; exit 1; }
  fnm use lts-latest || { print_error "Failed to use Node.js LTS"; exit 1; }
  print_success "Node.js ready ($(node -v))"
elif command -v node &> /dev/null; then
  print_success "Node.js already installed ($(node -v))"
else
  print_error "Node.js is not available and fnm is not installed"
  exit 1
fi

# Install pnpm if possible. npm remains a fallback for fresh machines where
# corepack cannot write a shim into the local user bin.
print_debug "Checking for pnpm..."
if ensure_pnpm_available; then
  print_success "pnpm ready"
else
  print_warning "pnpm is not available; dependency install requires pnpm"
fi

echo ""
print_step "[2/4] Installing project dependencies..."
print_debug "Installing Node project dependencies..."
if install_project_dependencies; then
  print_success "Dependencies installed"
else
  print_error "Dependency install failed"
  print_error "This often means disk space ran out or the bootstrap environment is incomplete"
  print_error "Check available space with: df -h"
  print_error "Try running manually: cd $DOTFILES_DIR && npm install"
  print_error "Then resume with: cd $DOTFILES_DIR && ./bootstrap.sh"
  exit 1
fi

echo ""
print_step "[3/4] Applying base dotfiles..."
echo ""

print_debug "Applying chezmoi source state..."
if ! bash "$DOTFILES_DIR/scripts/apply-chezmoi.sh"; then
  print_error "chezmoi apply failed"
  print_error "Fix the message above, then resume with: cd $DOTFILES_DIR && ./bootstrap.sh"
  exit 1
fi
print_success "Chezmoi dotfiles applied!"

echo ""
print_step "[4/4] Opening interactive setup dashboard..."

# Try several strategies to launch the interactive setup.
# A login shell is ideal — it sources brew shellenv, fnm, and other
# env from the chezmoi-managed config we just applied in step 3.
# But in a curl | bash context $SHELL is /bin/bash, not the user's
# login shell, so the login shell path may fail.  Fall back to
# direct pnpm exec, explicit tsx, then npm exec.

if "$SHELL" -l -c "cd '$DOTFILES_DIR' && exec pnpm exec tsx setup.ts '$DOTFILES_DIR'${SETUP_PATH:+ --setup-path '$SETUP_PATH'}" < /dev/tty 2>&1; then
  print_success "Interactive setup complete!"
elif cd "$DOTFILES_DIR" && pnpm exec tsx setup.ts "$DOTFILES_DIR" ${SETUP_PATH:+ --setup-path "$SETUP_PATH"} < /dev/tty 2>&1; then
  print_success "Interactive setup complete!"
elif "$DOTFILES_DIR/node_modules/.bin/tsx" "$DOTFILES_DIR/setup.ts" "$DOTFILES_DIR" ${SETUP_PATH:+ --setup-path "$SETUP_PATH"} < /dev/tty 2>&1; then
  print_success "Interactive setup complete!"
elif (cd "$DOTFILES_DIR" && npm exec --yes tsx -- setup.ts "$DOTFILES_DIR" ${SETUP_PATH:+ --setup-path "$SETUP_PATH"}) < /dev/tty 2>&1; then
  print_success "Interactive setup complete!"
else
  print_error "Interactive setup did not launch automatically."
  print_error "Run: cd $DOTFILES_DIR && pnpm exec tsx setup.ts $DOTFILES_DIR"
  exit 1
fi

prompt_shell_refresh
