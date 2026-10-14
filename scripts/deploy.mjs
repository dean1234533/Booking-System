// Keep widget, Worker and Firebase Hosting in the same deployment pipeline.
// BUILD_OUTPUT_DIR allows local builds to stay on the user's external drive.
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(process.env.BUILD_OUTPUT_DIR || join(root, 'dist'));
const workspace = dirname(output);
const widgetOutput = join(workspace, 'widget-build');
const publicOutput = join(workspace, 'public-build');
const config = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
const project = JSON.parse(readFileSync(join(root, '.firebaserc'), 'utf8')).projects.default;
const env = { ...process.env, BUILD_OUTPUT_DIR: output, BUILD_PUBLIC_DIR: publicOutput, WIDGET_OUTPUT_DIR: widgetOutput };

function run(command, args, cwd = root, envOverrides = {}) {
  const result = spawnSync(command, args, { cwd, env: { ...env, ...envOverrides }, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

mkdirSync(workspace, { recursive: true });
if (!process.argv.includes('--skip-build')) {
  run('npm', ['run', 'build:widget']);
  cpSync(join(root, 'public'), publicOutput, { recursive: true, filter: (source) => !/(?:^|\/)\.(?:_|DS_Store)/.test(source) });
  copyFileSync(join(widgetOutput, 'widget.js'), join(publicOutput, 'widget.js'));
  run('npm', ['run', 'build']);
}
if (!existsSync(join(output, 'index.html')) || !existsSync(join(output, 'widget.js'))) {
  throw new Error('The reviewed app and widget build must exist before deployment.');
}
if (process.argv.includes('--prepare-only')) process.exit(0);

const hostingConfig = join(workspace, 'firebase-hosting.json');
writeFileSync(hostingConfig, JSON.stringify({ hosting: { ...config.hosting, public: basename(output) } }, null, 2));
run(join(root, 'node_modules/.bin/wrangler'), ['deploy', '--assets', output, '--outdir', join(workspace, 'worker-build')]);
run('firebase', ['deploy', '--only', 'hosting', '--project', project, '--config', hostingConfig, '--non-interactive'], workspace, process.env.FIREBASE_DEPLOY_CONFIG_HOME ? { XDG_CONFIG_HOME: process.env.FIREBASE_DEPLOY_CONFIG_HOME } : {});
