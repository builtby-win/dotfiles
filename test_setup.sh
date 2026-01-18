#!/bin/bash
# Simulate selecting "Setup dotfiles" then going back
(echo; sleep 0.2; echo; sleep 0.2; echo) | pnpm exec tsx setup.ts 2>&1 | head -40
