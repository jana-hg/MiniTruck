import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Icon from './Icon';

// Utility to create cropped image from canvas
async function getCroppedImg(imageSrc, pixelCrop) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = imageSrc; });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function ImageCropper({ imageSrc, onCropDone, onCancel, isDark, aspect = 3 / 2 }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9',
    card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#34D399' : '#10B981',
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleDone = async () => {
    if (!croppedAreaPixels) return;
    const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
    onCropDone(cropped);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }}>
      {/* Crop area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Controls */}
      <div style={{ background: C.card, padding: '14px 16px', borderTop: `1px solid ${C.border}` }}>
        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Icon name="zoom_out" size={16} style={{ color: C.muted }} />
          <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: C.accent }} />
          <Icon name="zoom_in" size={16} style={{ color: C.muted }} />
        </div>

        {/* Rotate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Icon name="rotate_left" size={16} style={{ color: C.muted }} />
          <input type="range" min={0} max={360} step={1} value={rotation} onChange={e => setRotation(Number(e.target.value))}
            style={{ flex: 1, accentColor: C.accent }} />
          <Icon name="rotate_right" size={16} style={{ color: C.muted }} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: C.muted }}>
            Cancel
          </button>
          <button onClick={handleDone}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: C.accent, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="crop" size={16} /> Crop & Use
          </button>
        </div>
      </div>
    </div>
  );
}
