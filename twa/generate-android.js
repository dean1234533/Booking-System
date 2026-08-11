#!/usr/bin/env node
// Directly generates the Android TWA project without interactive prompts

const path = require('path');
const corePath = '/usr/local/lib/node_modules/@bubblewrap/cli/node_modules/@bubblewrap/core';
const { TwaGenerator } = require(path.join(corePath, 'dist/lib/TwaGenerator'));
const { TwaManifest } = require(path.join(corePath, 'dist/lib/TwaManifest'));

const targetDir = path.join(__dirname, 'android');

const manifestData = {
  packageId: 'com.bookrightly.app',
  host: 'bookrightly.co.uk',
  name: 'Bookrightly',
  launcherName: 'Bookrightly',
  display: 'standalone',
  orientation: 'portrait',
  themeColor: '#0a0a0a',
  navigationColor: '#0a0a0a',
  navigationColorDark: '#0a0a0a',
  navigationDividerColor: '#0a0a0a',
  navigationDividerColorDark: '#0a0a0a',
  backgroundColor: '#0a0a0a',
  startUrl: '/',
  iconUrl: 'https://bookrightly.co.uk/images/icon-512.png',
  maskableIconUrl: 'https://bookrightly.co.uk/images/icon-512-maskable.png',
  monochromeIconUrl: null,
  appVersion: '1',
  appVersionCode: 1,
  signingKey: {
    path: '../bookrightly.keystore',
    alias: 'bookrightly',
  },
  splashScreenFadeOutDuration: 300,
  enableNotifications: false,
  shortcuts: [],
  generatorApp: 'bubblewrap-cli',
  webManifestUrl: new URL('https://bookrightly.co.uk/manifest.json'),
  fallbackType: 'customtabs',
  features: {},
  alphaDependencies: { enabled: false },
  enableSiteSettingsShortcut: true,
  isChromeOSOnly: false,
  isMetaQuest: false,
  fullScopeUrl: new URL('https://bookrightly.co.uk/'),
  minSdkVersion: 19,
  pwaCompatEnabled: true,
  fingerprints: [{
    name: 'bookrightly',
    value: 'C4:A4:38:9C:FF:92:1F:D9:D9:41:1D:8D:27:69:E3:C9:78:55:D3:D0:AB:96:EB:AD:1B:D0:18:BA:DA:1A:F4:4D',
  }],
};

async function main() {
  console.log('Creating TWA manifest...');
  const twaManifest = new TwaManifest(manifestData);

  console.log('Generating Android project to:', targetDir);
  const generator = new TwaGenerator();

  await generator.createTwaProject(targetDir, twaManifest, console);
  console.log('\nAndroid project generated successfully!');
  console.log('Now run: cd android && ./gradlew bundleRelease');
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
