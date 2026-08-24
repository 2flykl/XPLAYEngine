'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function defaultExePath() {
  return path.join(__dirname, '..', 'tools', 'realesrgan', 'realesrgan-ncnn-vulkan.exe');
}

function configuredExePath() {
  return process.env.REALESRGAN_PATH || defaultExePath();
}

function modelFor(kind) {
  if (kind === 'anime' || kind === 'cartoon' || kind === 'cel') return 'realesrgan-x4plus-anime';
  return process.env.REALESRGAN_MODEL || 'realesrgan-x4plus';
}

function status() {
  const exePath = configuredExePath();
  return {
    configured: !!exePath,
    available: fs.existsSync(exePath),
    exePath,
    defaultModel: process.env.REALESRGAN_MODEL || 'realesrgan-x4plus',
    animeModel: 'realesrgan-x4plus-anime',
    supportedScales: [2, 4]
  };
}

async function upscaleBuffer(buffer, options = {}) {
  const scale = Number(options.scale || 4);
  if (![2, 4].includes(scale)) {
    throw new Error('Unsupported upscale scale. XPLAY Local Upscale currently allows 2x or 4x.');
  }

  const exePath = configuredExePath();
  if (!fs.existsSync(exePath)) {
    throw new Error(`Real-ESRGAN executable not found at: ${exePath}`);
  }

  const model = options.model || modelFor(options.kind);
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xplay-upscale-'));
  const inputPath = path.join(tempRoot, 'input.png');
  const outputPath = path.join(tempRoot, 'output.png');

  try {
    await fs.promises.writeFile(inputPath, buffer);

    const args = [
      '-i', inputPath,
      '-o', outputPath,
      '-n', model,
      '-s', String(scale),
      '-f', 'png'
    ];

    const { stdout, stderr } = await execFileAsync(exePath, args, {
      cwd: path.dirname(exePath),
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Real-ESRGAN completed without producing output.png. ${stderr || stdout || ''}`.trim());
    }

    const output = await fs.promises.readFile(outputPath);
    return {
      buffer: output,
      model,
      scale,
      stdout: stdout || '',
      stderr: stderr || ''
    };
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  status,
  upscaleBuffer,
  configuredExePath,
  modelFor
};
