import fs from 'node:fs';
import path from 'node:path';
import { transformSync } from '@babel/core';
import presetEnv from '@babel/preset-env';

const projectPath = process.env.WECHAT_MP_PROJECT_PATH || 'dist/build/mp-weixin';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

if (!fs.existsSync(projectPath)) {
  console.error(`Mini-program build directory does not exist: ${projectPath}`);
  process.exit(1);
}

const files = walk(projectPath).filter((filePath) => path.extname(filePath) === '.js');
for (const filePath of files) {
  const source = fs.readFileSync(filePath, 'utf8');
  const result = transformSync(source, {
    filename: filePath,
    babelrc: false,
    configFile: false,
    comments: false,
    compact: true,
    presets: [[presetEnv, {
      bugfixes: true,
      modules: false,
      targets: { chrome: '53' },
      useBuiltIns: false,
    }]],
  });
  fs.writeFileSync(filePath, result.code.endsWith('\n') ? result.code : `${result.code}\n`);
}

console.log(`Transpiled ${files.length} WeChat JavaScript files for miniprogram-ci.`);
