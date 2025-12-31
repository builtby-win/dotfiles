# Shell functions
# builtby.win/dotfiles

# Quick git commit with message
c() {
  if [[ $# -gt 0 ]]; then
    git commit -m "$*"
  else
    git commit -v
  fi
}

# Interactive branch checkout with fzf
co() {
  if [[ $# -gt 0 ]]; then
    git checkout "$@"
  else
    git checkout $(git branch -l | sed 's/^ *//' | fzf --preview 'git show heads/{} | diff-so-fancy' 2>/dev/null || git branch -l | sed 's/^ *//' | fzf)
  fi
}

# Checkout recent branches with fzf
cor() {
  co $(git recent $1 | fzf)
}

# Create new branch with prefix
cob() {
  git checkout -b "$(echo $* | tr ' ' -)"
}

# Download audio as mp3 (requires yt-dlp)
mp3() {
  if [[ $# -gt 0 ]]; then
    builtin cd ~/Downloads
    yt-dlp -f 'ba' -x --audio-format mp3 "$@"
    builtin cd -
  fi
}

# Download video as mp4 (requires yt-dlp)
mp4() {
  if [[ $# -gt 0 ]]; then
    builtin cd ~/Downloads
    yt-dlp -S res,ext:mp4:m4a --recode mp4 "$@"
    builtin cd -
  fi
}

# Make directory and cd into it
mkcd() {
  mkdir -p "$1" && cd "$1"
}

# Extract any archive
extract() {
  if [[ -f "$1" ]]; then
    case "$1" in
      *.tar.bz2) tar xjf "$1" ;;
      *.tar.gz)  tar xzf "$1" ;;
      *.bz2)     bunzip2 "$1" ;;
      *.rar)     unrar x "$1" ;;
      *.gz)      gunzip "$1" ;;
      *.tar)     tar xf "$1" ;;
      *.tbz2)    tar xjf "$1" ;;
      *.tgz)     tar xzf "$1" ;;
      *.zip)     unzip "$1" ;;
      *.Z)       uncompress "$1" ;;
      *.7z)      7z x "$1" ;;
      *)         echo "'$1' cannot be extracted" ;;
    esac
  else
    echo "'$1' is not a valid file"
  fi
}
