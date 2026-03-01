#!/bin/bash
set -e

# Stash configs
cp next.config.ts next.config.backup.ts
cp next.config.ios.ts next.config.ts

# Stash API routes outside app/ (not needed in static export — calls go to NEXT_PUBLIC_API_URL)
mv src/app/api /tmp/bloomberg-api-bak

# Always restore on exit (success or error)
restore() {
  mv /tmp/bloomberg-api-bak src/app/api 2>/dev/null || true
  cp next.config.backup.ts next.config.ts
  rm -f next.config.backup.ts
}
trap restore EXIT

# Build
next build

# Sync to iOS
npx cap sync ios
