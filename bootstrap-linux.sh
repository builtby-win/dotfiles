#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  +-------------------------------------------+"
  echo "  |         builtby.win/dotfiles              |"
  echo "  +-------------------------------------------+"
  echo -e "${NC}"
}

print_step() {
  echo -e "${BLUE}==>${NC} ${BOLD}$1${NC}"
}

print_success() {
  echo -e "${GREEN}[ok]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[warn]${NC} $1"
}

print_error() {
  echo -e "${RED}[error]${NC} $1"
}

print_debug() {
  echo -e "${CYAN}[debug]${NC} $1"
}

REPO_URL="https://github.com/builtby-win/dotfiles.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd 2>/dev/null || echo "")"
LINUX_PKG_MANAGER=""
NON_INTERACTIVE=0

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -y|--yes)
        NON_INTERACTIVE=1
        ;;
      -h|--help)
        echo "Usage: bootstrap-linux.sh [options]"
        echo "  -y, --yes   Run non-interactively (auto-approve all prompts)"
        echo "  -h, --help  Show this help message"
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        exit 1
        ;;
    esac
    shift
  done
}

detect_package_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="apt"
  elif command -v dnf >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="dnf"
  elif command -v pacman >/dev/null 2>&1; then
    LINUX_PKG_MANAGER="pacman"
  else
    print_error "Could not find a supported package manager (apt-get, dnf, pacman)"
    exit 1
  fi
}

install_packages() {
  case "$LINUX_PKG_MANAGER" in
    apt) sudo apt-get update -qq && sudo apt-get install -y "$@" ;;
    dnf) sudo dnf install -y "$@" ;;
    pacman) sudo pacman -S --noconfirm --needed "$@" ;;
  esac
}

ensure_command() {
  local cmd="$1" pkg="${2:-$1}"
  command -v "$cmd" >/dev/null 2>&1 && return 0
  print_step "Installing ${cmd}..."
  install_packages "$pkg"
  command -v "$cmd" >/dev/null 2>&1 || { print_error "Failed to install ${cmd}"; exit 1; }
  print_success "${cmd} installed"
}

# === Main flow ===

[[ "$(uname -s)" != "Linux" ]] && { print_error "This script is for Linux only"; exit 1; }

parse_args "$@"
print_banner
detect_package_manager
print_debug "Detected package manager: ${LINUX_PKG_MANAGER}"

if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
  DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
  print_debug "Non-interactive mode enabled (--yes)"
else
  echo -e "Where should we install the dotfiles? ${CYAN}(press enter for ~/dotfiles)${NC}"
  read -r -p "> " DOTFILES_DIR < /dev/tty || { print_error "Cannot read from terminal"; exit 1; }
fi

DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
DOTFILES_DIR="${DOTFILES_DIR/#\~/$HOME}"

mkdir -p "$DOTFILES_DIR" || { print_error "Failed to create ${DOTFILES_DIR}"; exit 1; }

ensure_command git git
ensure_command curl curl

print_step "Preparing dotfiles repository..."
if [[ -d "$DOTFILES_DIR/.git" ]]; then
  cd "$DOTFILES_DIR" && git pull --rebase
  print_success "Dotfiles updated"
elif [[ -d "$DOTFILES_DIR" && -n "$(ls -A "$DOTFILES_DIR")" ]]; then
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    print_warning "Directory ${DOTFILES_DIR} exists and is not empty, continuing anyway"
  else
    print_warning "Directory ${DOTFILES_DIR} exists and is not empty"
    echo -e "  ${CYAN}[b]${NC}ackup & continue | ${CYAN}[c]${NC}ontinue anyway | ${CYAN}[q]${NC}uit"
    read -r -p "  > " choice < /dev/tty || { print_error "Cannot read from terminal"; exit 1; }
    case "$choice" in
      b|B)
        backup_dir="${DOTFILES_DIR}.backup.$(date +%Y%m%d%H%M%S)"
        mv "$DOTFILES_DIR" "$backup_dir" || { print_error "Failed to create backup"; exit 1; }
        print_success "Backed up to ${backup_dir}"
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
  fi
elif [[ -n "$SCRIPT_DIR" && -f "$SCRIPT_DIR/setup.ts" ]]; then
  DOTFILES_DIR="$SCRIPT_DIR"
  print_success "Using local dotfiles at ${DOTFILES_DIR}"
else
  git clone "$REPO_URL" "$DOTFILES_DIR" || { print_error "git clone failed"; exit 1; }
  print_success "Cloned to ${DOTFILES_DIR}"
fi

cd "$DOTFILES_DIR"

print_step "Setting up Node.js environment..."

if ! command -v fnm >/dev/null 2>&1; then
  command -v unzip >/dev/null 2>&1 || install_packages unzip
  if curl -fsSL https://fnm.vercel.app/install | bash 2>/dev/null; then
    [[ -x "$HOME/.local/share/fnm/fnm" ]] && export PATH="$HOME/.local/share/fnm:$PATH"
    command -v fnm >/dev/null 2>&1 && eval "$(fnm env --use-on-cd --shell bash)" || true
  fi
fi

if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --use-on-cd --shell bash)" 2>/dev/null || true
  fnm install --lts >/dev/null 2>&1 || { print_error "Failed to install Node.js LTS via fnm"; exit 1; }
  fnm default lts-latest >/dev/null 2>&1 || { print_error "Failed to set fnm default Node.js version"; exit 1; }
  fnm use lts-latest >/dev/null 2>&1 || { print_error "Failed to activate Node.js LTS via fnm"; exit 1; }
fi

if ! command -v node >/dev/null 2>&1; then
  install_packages nodejs npm
fi

command -v node >/dev/null 2>&1 || { print_error "Failed to install Node.js"; exit 1; }
print_success "Node.js ready ($(node -v))"

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable 2>/dev/null || true
    corepack prepare pnpm@latest --activate 2>/dev/null || true
  fi
  command -v pnpm >/dev/null 2>&1 || npm install -g pnpm 2>/dev/null || true
  command -v pnpm >/dev/null 2>&1 || { print_error "Failed to install pnpm"; exit 1; }
fi
print_success "pnpm ready"

print_step "Installing dependencies..."
pnpm install --silent || { print_error "pnpm install failed"; exit 1; }
print_success "Dependencies installed"

echo ""
print_step "Launching interactive setup..."
TSX_BIN="./node_modules/.bin/tsx"
if [[ -x "$TSX_BIN" ]]; then
  "$TSX_BIN" setup.ts "$DOTFILES_DIR" < /dev/tty || true
elif command -v pnpm >/dev/null 2>&1; then
  pnpm exec tsx setup.ts "$DOTFILES_DIR" < /dev/tty || true
else
  print_warning "Cannot run setup.ts"
fi

print_success "Linux bootstrap complete"
