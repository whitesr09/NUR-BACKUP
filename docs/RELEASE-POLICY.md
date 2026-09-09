# Release policy

All feature increments are committed and tested before the final Android build. The release workflow is manually dispatched only after the agreed feature set is ready. Existing package identity, signing certificate, and app data must not be replaced or reset. Never generate a new release signing key as a fallback. Keep signing passwords and key material out of logs and new commits.
