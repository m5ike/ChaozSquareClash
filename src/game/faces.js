import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';

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

export function getFaceTexture(character) {
  if (!character) return null;
  const key = character.id;
  if (faceCache[key]) return faceCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  drawPixelFace(ctx, character);

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
