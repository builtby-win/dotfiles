#!/bin/bash
# Auto-attach to herdr on SSH login shells.
# Sourced from shell/init.sh. Exec-replaces interactive SSH shells with herdr.

# Opt-out: export NO_HERDR_AUTO=1 to skip.
if [[ -n "$NO_HERDR_AUTO" ]]; then
  return 0 2>/dev/null || true
fi

# Only interactive shells.
case "$-" in
  *i*) ;;
  *) return 0 2>/dev/null || true ;;
esac

# Only when attached to a terminal (skip scp/sftp/rsync/subshells).
if [[ ! -t 0 || ! -t 1 ]]; then
  return 0 2>/dev/null || true
fi

# Only on SSH sessions.
if [[ -z "$SSH_CONNECTION" && -z "$SSH_CLIENT" && -z "$SSH_TTY" ]]; then
  return 0 2>/dev/null || true
fi

# Already inside herdr: don't nest.
if [[ -n "$HERDR_ENV" || -n "$HERDR_PANE_ID" || "$TERM_PROGRAM" == "herdr" ]]; then
  return 0 2>/dev/null || true
fi

if ! command -v herdr &>/dev/null; then
  return 0 2>/dev/null || true
fi

# Replace the login shell with herdr (launch or attach to persistent session).
exec herdr
