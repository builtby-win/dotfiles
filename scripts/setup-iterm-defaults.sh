#!/bin/bash
# Apply BuiltBy iTerm2 defaults without replacing the user's full preferences.

set -euo pipefail

DOMAIN="${ITERM_DEFAULTS_DOMAIN:-com.googlecode.iterm2}"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "iTerm2 defaults are macOS only."
  exit 0
fi

ensure_global_key_map() {
  if ! defaults read "$DOMAIN" GlobalKeyMap >/dev/null 2>&1; then
    defaults write "$DOMAIN" GlobalKeyMap -dict
  fi
}

upsert_key_mapping() {
  local key="$1"
  local mapping="$2"

  defaults delete "$DOMAIN" "GlobalKeyMap.${key}" >/dev/null 2>&1 || true
  defaults write "$DOMAIN" GlobalKeyMap -dict-add "$key" "$mapping"
}

ensure_global_key_map

# Delete line/word backwards. These fix the common fresh-iTerm gap where
# Command-Backspace and Option-Backspace do not behave like shell editing keys.
upsert_key_mapping "0x7f-0x100000-0x33" '{ Action = 11; Label = ""; Text = "0x15"; Version = 1; }'
upsert_key_mapping "0x7f-0x80000-0x33" '{ Action = 11; Label = ""; Text = "0x17"; Version = 1; }'

# Ctrl-A/E should move to the start/end of the prompt, matching readline/zsh.
upsert_key_mapping "0x61-0x40000-0x0" '{ Action = 11; Label = ""; Text = "0x01"; Version = 1; }'
upsert_key_mapping "0x65-0x40000-0xe" '{ Action = 11; Label = ""; Text = "0x05"; Version = 1; }'

# Keep the rest of the BuiltBy global navigation shortcuts from the reference iTerm setup.
upsert_key_mapping "0x9-0x40000" '{ Action = 32; Text = ""; }'
upsert_key_mapping "0x19-0x60000" '{ Action = 39; Text = ""; }'
upsert_key_mapping "0xf72b-0x100000" '{ Action = 4; Text = ""; }'
upsert_key_mapping "0xf72c-0x20000" '{ Action = 9; Text = ""; }'
upsert_key_mapping "0xf72c-0x100000" '{ Action = 9; Text = ""; }'
upsert_key_mapping "0xf72d-0x20000" '{ Action = 8; Text = ""; }'
upsert_key_mapping "0xf72d-0x100000" '{ Action = 8; Text = ""; }'
upsert_key_mapping "0xf700-0x300000" '{ Action = 7; Text = ""; }'
upsert_key_mapping "0xf701-0x300000" '{ Action = 6; Text = ""; }'
upsert_key_mapping "0xf702-0x300000" '{ Action = 11; "Apply Mode" = 0; Escaping = 1; Text = "0x01"; Version = 2; }'
upsert_key_mapping "0xf702-0x320000" '{ Action = 33; Text = ""; }'
upsert_key_mapping "0xf703-0x300000" '{ Action = 11; "Apply Mode" = 0; Escaping = 1; Text = "0x05"; Version = 2; }'
upsert_key_mapping "0xf703-0x320000" '{ Action = 34; Text = ""; }'
upsert_key_mapping "0xf729-0x100000" '{ Action = 5; Text = ""; }'

echo "Applied BuiltBy iTerm2 key defaults. Restart iTerm2 for all shortcuts to refresh."
