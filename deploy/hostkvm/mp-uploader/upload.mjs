// 和 master-travel-project 的 scripts/upload-mp-weixin.mjs 做同樣的事，路徑固定在容器內。
import fs from 'node:fs';
import process from 'node:process';
import ci from 'miniprogram-ci';

const projectPath = '/project';
const privateKeyPath = '/run/secrets/wechat-upload.key';
for (const name of ['WECHAT_APPID', 'WECHAT_MP_VERSION', 'WECHAT_MP_DESC']) {
  if (!process.env[name]) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
}
if (!fs.existsSync(privateKeyPath)) {
  console.error('WeChat upload key is missing');
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
