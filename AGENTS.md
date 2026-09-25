# Project release preference

Cesar has asked that completed Flight Desk updates follow the established GitHub release workflow without requiring a separate reminder: validate the changes, increment the alpha build version, update the README and changelog, build and verify the Windows installer, commit and push the intended changes, and publish a GitHub prerelease with the installer, simulator-helper ZIP, and SHA256SUMS.txt. Return the installer download link.

An explicit request to hold, review, or avoid publishing overrides this preference. Do not publish a failed or unverified build, or include unrelated local changes.

Use `pnpm test` and `pnpm test:ui`. Launch UI tests through their Node launcher so Windows GUI processes do not retain closed console pipes. Reuse the existing helper archive only when its source is unchanged; otherwise rebuild it.
