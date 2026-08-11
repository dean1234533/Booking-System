#!/usr/bin/env node
// Directly generates the Android TWA project without interactive prompts

const path = require('path');
const http = require('http');
const fs = require('fs');
const corePath = '/usr/local/lib/node_modules/@bubblewrap/cli/node_modules/@bubblewrap/core';
const { TwaGenerator } = require(path.join(corePath, 'dist/lib/TwaGenerator'));
const { TwaManifest } = require(path.join(corePath, 'dist/lib/TwaManifest'));

const targetDir = path.join(__dirname, 'android');
const imagesDir = path.join(__dirname, '../public/images');

function startIconServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(imagesDir, path.basename(req.url));
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        fs.createReadStream(file).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`Icon server running on port ${port}`);
      resolve({ server, port });
    });
  });
}

async function main() {
  const { server, port } = await startIconServer();
  const base = `http://127.0.0.1:${port}`;

  try {
    console.log('Creating TWA manifest...');
    const twaManifest = new TwaManifest({
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
      iconUrl: `${base}/icon-512.png`,
      maskableIconUrl: `${base}/icon-512-maskable.png`,
      monochromeIconUrl: null,
      appVersion: '1',
      appVersionCode: 1,
      signingKey: { path: '../bookrightly.keystore', alias: 'bookrightly' },
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
    });

    console.log('Generating Android project to:', targetDir);
    const generator = new TwaGenerator();
    await generator.createTwaProject(targetDir, twaManifest, console);
    console.log('\nAndroid project generated successfully!');

    // Update twa-manifest.json icon URLs to real production URLs
    const manifestPath = path.join(targetDir, 'twa-manifest.json');
    if (fs.existsSync(manifestPath)) {
      const saved = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      saved.iconUrl = 'https://bookrightly.co.uk/images/icon-512.png';
      saved.maskableIconUrl = 'https://bookrightly.co.uk/images/icon-512-maskable.png';
      fs.writeFileSync(manifestPath, JSON.stringify(saved, null, 2));
      console.log('Updated twa-manifest.json with production icon URLs.');
    }
  } finally {
    server.close();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
