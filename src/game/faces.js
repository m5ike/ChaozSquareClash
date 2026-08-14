import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';
import { getCaricatureFaceCanvas } from '@/game/caricatures.js';

// Textury obličejů pro 3D modely postav.
// Z portrétu se vyřízne oblast hlavy (horní střed obrázku) do 48×48 pixelové
// textury; postavy bez portrétu dostanou procedurální pixel-art obličej.
const faceCache = {};

function drawPixelFace(ctx, character) {
  // pleť
  ctx.fillStyle = '#e0b088';
  ctx.fillRect(0, 0, 48, 48);
  // vlasy — odstín odvozený z barvy postavy, ať se od sebe liší
  ctx.fillStyle = character?.color || '#3a2a20';
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, 0, 48, 10);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a1e16';
  ctx.fillRect(0, 0, 48, 6);
  // oči
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, 18, 9, 7);
  ctx.fillRect(29, 18, 9, 7);
  ctx.fillStyle = '#222222';
  ctx.fillRect(13, 20, 4, 5);
  ctx.fillRect(32, 20, 4, 5);
  // ústa
  ctx.fillRect(17, 35, 14, 3);
}

// --- Mimika: výrazové textury (vrstva kresleného výrazu přes obličej) -------
// Cache per postava+výraz; kreslí se komiksově přes základní obličej.
const expressionCache = {};

function drawExpressionOverlay(ctx, id) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1a1210';
  if (id === 'wink') {
    // levé oko zavřené (čárka), pravé normální nechat — jen přiznat mrknutí
    ctx.fillRect(9, 21, 11, 3);
    ctx.fillStyle = '#00000055';
    ctx.fillRect(29, 18, 9, 7);
  } else if (id === 'frown') {
    // svraštělé obočí + přísná ústa
    ctx.save();
    ctx.translate(14, 15);
    ctx.rotate(0.35);
    ctx.fillRect(-6, -2, 13, 3);
    ctx.restore();
    ctx.save();
    ctx.translate(34, 15);
    ctx.rotate(-0.35);
    ctx.fillRect(-7, -2, 13, 3);
    ctx.restore();
    ctx.fillRect(16, 36, 16, 3);
  } else if (id === 'laugh') {
    // úsměv s otevřenou pusou
    ctx.fillRect(14, 33, 20, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, 33, 18, 3);
    ctx.fillStyle = '#7a2020';
    ctx.fillRect(16, 37, 16, 3);
  } else if (id === 'amlaugh') {
    // americký smích — obří zubatý úsměv od ucha k uchu
    ctx.fillRect(8, 31, 32, 11);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) ctx.fillRect(9 + i * 5.2, 32, 4, 4);
    for (let i = 0; i < 6; i++) ctx.fillRect(9 + i * 5.2, 37, 4, 4);
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(8, 36, 32, 1);
  } else if (id === 'scream') {
    // řev — dokořán otevřená ústa, zvednuté obočí
    ctx.fillRect(11, 13, 10, 3);
    ctx.fillRect(27, 13, 10, 3);
    ctx.fillStyle = '#2a0f0f';
    ctx.beginPath();
    ctx.ellipse(24, 37, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a2020';
    ctx.fillRect(20, 40, 8, 3);
  } else if (id === 'cry') {
    // pláč — smutné obočí, slzy, obrácená ústa
    ctx.save();
    ctx.translate(14, 16);
    ctx.rotate(-0.3);
    ctx.fillRect(-6, -2, 12, 3);
    ctx.restore();
    ctx.save();
    ctx.translate(34, 16);
    ctx.rotate(0.3);
    ctx.fillRect(-6, -2, 12, 3);
    ctx.restore();
    ctx.fillRect(17, 39, 14, 3);
    ctx.fillRect(15, 36, 3, 3);
    ctx.fillRect(30, 36, 3, 3);
    ctx.fillStyle = '#4aa6ff';
    ctx.fillRect(13, 26, 3, 10);
    ctx.fillRect(32, 26, 3, 10);
  }
}

export function getExpressionTexture(character, expressionId) {
  if (!character || typeof document === 'undefined') return null;
  const key = `${character.id}:${expressionId}`;
  if (expressionCache[key]) return expressionCache[key];
  const base = getFaceTexture(character);
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (base?.image) ctx.drawImage(base.image, 0, 0);
  drawExpressionOverlay(ctx, expressionId);
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  expressionCache[key] = texture;
  return texture;
}

export function getFaceTexture(character) {
  if (!character) return null;
  const key = character.id;
  if (faceCache[key]) return faceCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  // bez portrétu: karikaturní obličej z generátoru, fallback pixel-art
  const caricatureFace = !character.portrait ? getCaricatureFaceCanvas(character) : null;
  if (caricatureFace) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(caricatureFace, 0, 0, 48, 48);
  } else {
    drawPixelFace(ctx, character);
  }

  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  faceCache[key] = texture;

  // Asynchronní výřez hlavy z portrétu (jakmile se obrázek načte)
  if (character.portrait) {
    const img = new Image();
    img.onload = () => {
      const srcW = img.width * 0.55;
      const srcH = img.height * 0.3;
      const srcX = (img.width - srcW) / 2;
      const srcY = img.height * 0.02;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 48, 48);
      texture.needsUpdate = true;
    };
    img.src = character.portrait;
  }
  return texture;
}
