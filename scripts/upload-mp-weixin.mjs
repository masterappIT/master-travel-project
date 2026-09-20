import fs from 'node:fs';
import process from 'node:process';
import ci from 'miniprogram-ci';

const required = ['WECHAT_APPID', 'WECHAT_PRIVATE_KEY_PATH', 'WECHAT_MP_VERSION', 'WECHAT_MP_DESC'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const projectPath = process.env.WECHAT_MP_PROJECT_PATH || 'dist/build/mp-weixin';
const privateKeyPath = process.env.WECHAT_PRIVATE_KEY_PATH;
if (!fs.existsSync(projectPath)) {
  console.error(`Mini-program build directory does not exist: ${projectPath}`);
  process.exit(1);
}
if (!fs.existsSync(privateKeyPath)) {
  console.error(`WeChat private key file does not exist: ${privateKeyPath}`);
  process.exit(1);
}

const project = new ci.Project({
  appid: process.env.WECHAT_APPID,
  type: 'miniProgram',
  projectPath,
  privateKeyPath,
  ignores: ['node_modules/**/*'],
});

await ci.upload({
  project,
  version: process.env.WECHAT_MP_VERSION,
  desc: process.env.WECHAT_MP_DESC,
  setting: {},
  robot: Number(process.env.WECHAT_MP_ROBOT || '1'),
  onProgressUpdate({ phase, message }) {
    if (message) console.log(`[${phase}] ${message}`);
  },
});

console.log(`Uploaded WeChat mini-program experience build ${process.env.WECHAT_MP_VERSION}.`);
