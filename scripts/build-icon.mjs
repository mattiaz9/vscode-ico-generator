#!/usr/bin/env node
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'assets', 'icon.svg');
const pngPath = join(root, 'assets', 'icon.png');

const svg = readFileSync(svgPath);
await sharp(svg)
  .resize(128, 128)
  .png()
  .toFile(pngPath);

console.log('Generated assets/icon.png from assets/icon.svg');
