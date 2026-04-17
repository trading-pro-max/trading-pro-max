# Trading Pro Max Desktop

Trading Pro Max ships with a local Electron desktop shell that launches the real packaged workspace, restores local session state, and keeps the web and desktop paths aligned.

## Local Commands

- Web workspace: `npm run web:dev`
- Desktop workspace: `npm run desktop:dev`
- Desktop release-candidate bundle: `npm run desktop:rc`
- Windows installer/distributable: `npm run desktop:dist`

## Windows Output

- Installer output: `desktop/dist/Trading-Pro-Max-1.0.0-x64.exe`
- Unpacked validation build: `desktop/dist/win-unpacked/Trading Pro Max.exe`
- Packaged runtime bundle: `desktop/build-runtime`

## Brand Asset Paths

Final branded assets are not required for local packaging, but the release-ready placeholder structure is reserved here:

- Windows app icon: `desktop/assets/brand/icons/trading-pro-max.ico`
- NSIS installer header: `desktop/assets/brand/installer/trading-pro-max-installer-header.bmp`
- NSIS installer sidebar: `desktop/assets/brand/installer/trading-pro-max-installer-sidebar.bmp`
- Product wordmark/reference art: `desktop/assets/brand/trading-pro-max-wordmark.svg`

See [desktop/assets/README.md](/C:/Users/ahmad/Desktop/trading-pro-max-full/desktop/assets/README.md) for the exact placeholder structure and notes.

## Release Notes

- The packaged app boots the bundled standalone Trading Pro Max runtime from `resources/app-runtime`.
- The packaged runtime does not depend on a dev server or repo-local `node_modules`.
- Desktop runtime logs are written under `%APPDATA%\\Trading Pro Max\\desktop-runtime.log`.
