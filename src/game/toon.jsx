// Kreslený (toon/cel) shading — sdílený gradient pro MeshToonMaterial.
// Čtyřstupňový gradient dává tvrdé přechody stínů jako v klasických animácích.
import { DataTexture, RedFormat, NearestFilter } from 'three';

let gradientTexture = null;

export function getToonGradient() {
  if (gradientTexture) return gradientTexture;
  // 4 tóny: hluboký stín → stín → světlo → odlesk
  const data = new Uint8Array([90, 150, 215, 255]);
  gradientTexture = new DataTexture(data, 4, 1, RedFormat);
  gradientTexture.magFilter = NearestFilter;
  gradientTexture.minFilter = NearestFilter;
  gradientTexture.needsUpdate = true;
  return gradientTexture;
}

// Kreslený materiál — použití: <ToonMat color="#e05050" /> místo meshStandardMaterial.
export function ToonMat({ color, emissive = '#000000', emissiveIntensity = 0, opacity = 1, transparent = false }) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={getToonGradient()}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      opacity={opacity}
      transparent={transparent}
    />
  );
}
