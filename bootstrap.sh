#!/bin/bash
set -e

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

# Check if running from curl pipe or locally
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" 2>/dev/null)" && pwd 2>/dev/null || echo "")"
REPO_URL="https://github.com/builtby-win/dotfiles.git"

print_banner

# Ask for install location
echo -e "Where should we install the dotfiles? ${CYAN}(press enter for ~/dotfiles)${NC}"
read -r -p "> " DOTFILES_DIR
DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
DOTFILES_DIR="${DOTFILES_DIR/#\~/$HOME}"

echo ""

# Ensure Git is installed
if ! command -v git &> /dev/null; then
  print_step "Git not found. Attempting to install..."
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &> /dev/null; then
      print_step "Installing Git via Homebrew..."
      brew install git
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
if [ -d "$DOTFILES_DIR/.git" ]; then
  print_step "Updating existing dotfiles..."
  cd "$DOTFILES_DIR"
  git pull --rebase
  print_success "Dotfiles updated"
elif [ -d "$DOTFILES_DIR" ] && [ "$(ls -A "$DOTFILES_DIR")" ]; then
  print_warning "Directory $DOTFILES_DIR exists and is not empty"
  echo -e "  ${CYAN}[b]${NC}ackup & continue | ${CYAN}[c]${NC}ontinue anyway | ${CYAN}[q]${NC}uit"
  read -r -p "  > " choice
  case "$choice" in
    b|B)
      backup_dir="${DOTFILES_DIR}.backup.$(date +%Y%m%d%H%M%S)"
      mv "$DOTFILES_DIR" "$backup_dir"
      print_success "Backed up to $backup_dir"
      git clone "$REPO_URL" "$DOTFILES_DIR"
      ;;
    c|C)
      print_warning "Continuing with existing directory"
      ;;
    *)
      echo "Aborted."
      exit 1
      ;;
  esac
elif [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/setup.ts" ]; then
  # Running locally from the repo
  DOTFILES_DIR="$SCRIPT_DIR"
  print_success "Using local dotfiles at $DOTFILES_DIR"
else
  print_step "Cloning dotfiles..."
  git clone "$REPO_URL" "$DOTFILES_DIR"
  print_success "Cloned to $DOTFILES_DIR"
fi

cd "$DOTFILES_DIR"

echo ""
print_step "[1/3] Installing dependencies..."

# Install Homebrew if not present
if ! command -v brew &> /dev/null; then
  echo "  Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add Homebrew to PATH for this session
  if [[ "$(uname -m)" == "arm64" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  else
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  print_success "Homebrew installed"
else
  print_success "Homebrew already installed"
fi

# Install stow
if ! command -v stow &> /dev/null; then
  echo "  Installing GNU Stow..."
  brew install stow
  print_success "GNU Stow installed"
else
  print_success "GNU Stow already installed"
fi

# Install fnm (Fast Node Manager)
if ! command -v fnm &> /dev/null; then
  echo "  Installing fnm (Node version manager)..."
  brew install fnm

  # Setup fnm for this session
  eval "$(fnm env --use-on-cd)"
  print_success "fnm installed"
else
  eval "$(fnm env --use-on-cd)" 2>/dev/null || true
  print_success "fnm already installed"
fi

# Install Node.js via fnm
if ! command -v node &> /dev/null; then
  echo "  Installing Node.js..."
  fnm install --lts
  fnm use lts-latest
  print_success "Node.js installed"
else
  print_success "Node.js already installed ($(node -v))"
fi

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
  echo "  Installing pnpm..."
  npm install -g pnpm
  print_success "pnpm installed"
else
  print_success "pnpm already installed"
fi

echo ""
print_step "[2/3] Installing dependencies..."
pnpm install --silent
print_success "Dependencies installed"

echo ""
print_step "[3/3] Running interactive setup..."
echo ""

# Run the TypeScript setup
pnpm exec tsx setup.ts "$DOTFILES_DIR"
