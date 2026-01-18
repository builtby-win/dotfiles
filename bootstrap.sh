#!/bin/bash
set -e

# Debug trap to show line number on error
trap 'print_error "Command failed at line $LINENO"' ERR

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

# Check if running from curl pipe or locally
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" 2>/dev/null)" && pwd 2>/dev/null || echo "")"
REPO_URL="https://github.com/builtby-win/dotfiles.git"

print_banner

# Ask for install location
echo -e "Where should we install the dotfiles? ${CYAN}(press enter for ~/dotfiles)${NC}"
read -r -p "> " DOTFILES_DIR < /dev/tty || {
  print_error "Cannot read from terminal. Make sure you're running this script interactively."
  exit 1
}
DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
DOTFILES_DIR="${DOTFILES_DIR/#\~/$HOME}"
print_debug "Install directory: $DOTFILES_DIR"

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
print_step "[1/3] Installing dependencies..."

# Install Homebrew if not present
print_debug "Checking for homebrew..."
if ! command -v brew &> /dev/null; then
  echo "  Installing Homebrew..."
  print_debug "Downloading Homebrew installer..."
  if /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" 2>&1; then
    print_debug "Homebrew installed successfully"
  else
    print_error "Homebrew installation failed"
    exit 1
  fi

  # Add Homebrew to PATH for this session
  print_debug "Setting up Homebrew PATH (uname -m: $(uname -m))"
  if [[ "$(uname -m)" == "arm64" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)" || print_warning "Failed to set up arm64 Homebrew PATH"
  else
    eval "$(/usr/local/bin/brew shellenv)" || print_warning "Failed to set up x86 Homebrew PATH"
  fi
  print_success "Homebrew installed"
else
  print_success "Homebrew already installed"
fi

# Install stow
print_debug "Checking for GNU Stow..."
if ! command -v stow &> /dev/null; then
  echo "  Installing GNU Stow..."
  brew install stow || { print_error "Failed to install GNU Stow"; exit 1; }
  print_success "GNU Stow installed"
else
  print_success "GNU Stow already installed"
fi

# Install fnm (Fast Node Manager)
print_debug "Checking for fnm..."
if ! command -v fnm &> /dev/null; then
  echo "  Installing fnm (Node version manager)..."
  brew install fnm || { print_error "Failed to install fnm"; exit 1; }

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
if ! command -v node &> /dev/null; then
  echo "  Installing Node.js..."
  print_debug "Installing Node.js LTS..."
  fnm install --lts || { print_error "Failed to install Node.js"; exit 1; }
  fnm use lts-latest || { print_error "Failed to use Node.js LTS"; exit 1; }
  print_success "Node.js installed"
else
  print_success "Node.js already installed ($(node -v))"
fi

# Install pnpm if not present
print_debug "Checking for pnpm..."
if ! command -v pnpm &> /dev/null; then
  echo "  Installing pnpm..."
  npm install -g pnpm || { print_error "Failed to install pnpm"; exit 1; }
  print_success "pnpm installed"
else
  print_success "pnpm already installed"
fi

echo ""
print_step "[2/3] Installing dependencies..."
print_debug "Running: pnpm install"
if pnpm install --silent; then
  print_success "Dependencies installed"
else
  print_error "pnpm install failed"
  print_error "Try running manually: cd $DOTFILES_DIR && pnpm install"
  exit 1
fi

echo ""
print_step "[3/3] Running interactive setup..."
echo ""

# Run the TypeScript setup
print_debug "Running setup script: pnpm exec tsx setup.ts $DOTFILES_DIR"
set +e  # Disable exit-on-error for interactive setup
pnpm exec tsx setup.ts "$DOTFILES_DIR" < /dev/tty > /dev/tty 2>&1
exit_code=$?
set -e  # Re-enable exit-on-error

if [ $exit_code -ne 0 ] && [ $exit_code -ne 130 ]; then
  print_error "Setup script exited with code $exit_code"
  exit $exit_code
fi

print_success "Setup complete!"
