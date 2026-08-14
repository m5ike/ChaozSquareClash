// Procedurální textury generované do canvasu — žádné externí assety.
import { useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, NearestFilter } from 'three';

// Textura dlažby náměstí (kostky s náhodným odstínem a drobnými odlesky).
export function useCobblestoneTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a2a1a';
    ctx.fillRect(0, 0, 128, 128);
    const stoneSize = 12;
    for (let px = 0; px < 128; px += stoneSize) {
      for (let py = 0; py < 128; py += stoneSize) {
        const shade = 0.6 + Math.random() * 0.4;
        const red = (160 * shade) | 0;
        const green = (144 * shade) | 0;
        const blue = (118 * shade) | 0;
        const jitterX = (Math.random() - 0.5) * 3;
        const jitterY = (Math.random() - 0.5) * 3;
        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fillRect(px + 1 + jitterX, py + 1 + jitterY, stoneSize - 2, stoneSize - 2);
        // občasný světlejší odlesk na kostce
        if (Math.random() > 0.7) {
          ctx.fillStyle = `rgb(${Math.min(255, red + 25)},${Math.min(255, green + 22)},${Math.min(255, blue + 18)})`;
          ctx.fillRect(px + 2 + jitterX, py + 2 + jitterY, 2, 2);
        }
      }
    }
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(16, 12);
    texture.magFilter = NearestFilter;
    return texture;
  }, []);
}

// Textury budov: šumová fasáda s cihlovými spárami + emisní mapa rozsvícených oken.
export function useBuildingTextures() {
  return useMemo(() => {
    // fasáda
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1e3; i++) {
      const gray = 80 + Math.random() * 100;
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    // vodorovné spáry
    for (let y = 0; y < 128; y += 14) {
      ctx.fillStyle = '#555555';
      ctx.fillRect(0, y, 128, 1);
    }
    // svislé spáry, střídavě posunuté (cihlová vazba)
    for (let row = 0; row < 10; row++) {
      const offset = row % 2 === 0 ? 0 : 14;
      for (let x = offset; x < 128; x += 28) {
        ctx.fillStyle = '#555555';
        ctx.fillRect(x, row * 14, 1, 14);
      }
    }
    const facade = new CanvasTexture(canvas);
    facade.wrapS = facade.wrapT = RepeatWrapping;
    facade.repeat.set(2, 2);
    facade.magFilter = NearestFilter;

    // emisní mapa oken (mřížka 3x3, cca 65 % rozsvícených)
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 128;
    winCanvas.height = 128;
    const winCtx = winCanvas.getContext('2d');
    winCtx.fillStyle = '#000';
    winCtx.fillRect(0, 0, 128, 128);
    const winWidth = 16;
    const winHeight = 20;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = 12 + col * 38;
        const y = 14 + row * 38;
        if (Math.random() > 0.35) {
          winCtx.fillStyle = '#fff';
          winCtx.fillRect(x, y, winWidth, winHeight);
          // černý kříž rámu okna
          winCtx.fillStyle = '#000';
          winCtx.fillRect(x + winWidth / 2 - 1, y, 2, winHeight);
          winCtx.fillRect(x, y + winHeight / 2 - 1, winWidth, 2);
        }
      }
    }
    const windows = new CanvasTexture(winCanvas);
    windows.wrapS = windows.wrapT = RepeatWrapping;
    windows.repeat.set(2, 2);
    windows.magFilter = NearestFilter;

    return { facade, windows };
  }, []);
}
