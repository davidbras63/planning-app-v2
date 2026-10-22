'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, ColorInput, FileButton, Group, Stack, Text } from '@mantine/core';
import { saveUserCustomization } from '@/app/actions/customization';

interface BackgroundPickerProps {
  opened: boolean;
  onClose: () => void;
}

export default function BackgroundPicker({ opened, onClose }: BackgroundPickerProps) {
  const [bgColor, setBgColor] = useState('');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgZoom, setBgZoom] = useState('cover');

  const notifyBackgroundChange = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bg-updated'));
    }
  };

  useEffect(() => {
    setBgColor(localStorage.getItem('nesis_bg_color') || '');
    setBgImage(localStorage.getItem('nesis_bg_image') || null);
    setBgZoom(localStorage.getItem('nesis_bg_zoom') || 'cover');
  }, []); 

  const handleColorChange = (color: string) => {
    setBgColor(color);
    localStorage.setItem('nesis_bg_color', color);
    setBgImage(null);
    localStorage.removeItem('nesis_bg_image');
    notifyBackgroundChange();
  };

  const handleZoomChange = (zoomValue: string) => {
    setBgZoom(zoomValue);
    localStorage.setItem('nesis_bg_zoom', zoomValue);
    notifyBackgroundChange();
  };

  const handleImageUpload = (file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image trop lourde ! Choisis une image de moins de 5 Mo.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);

          setBgColor('');
          localStorage.removeItem('nesis_bg_color');
          setBgImage(compressedBase64);
          localStorage.setItem('nesis_bg_image', compressedBase64);
          
          notifyBackgroundChange();
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setBgColor('');
    setBgImage(null);
    setBgZoom('cover');
    localStorage.removeItem('nesis_bg_color');
    localStorage.removeItem('nesis_bg_image');
    localStorage.removeItem('nesis_bg_zoom');
    notifyBackgroundChange();
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title="Personnalisation de l'arrière-plan"
      centered
      size="sm"
    >
      <Stack gap="md">
        <div>
          <Text size="xs" fw={500} mb={4}>Couleur de fond unie :</Text>
          <ColorInput 
            value={bgColor || '#0f172a'} 
            onChange={handleColorChange}
            format="hex"
            swatches={['#0f172a', '#1e293b', '#0284c7', '#4c1d95', '#111827']}
          />
        </div>

        <div>
          <Text size="xs" fw={500} mb={4}>Image de fond :</Text>
          <FileButton onChange={handleImageUpload} accept="image/png,image/jpeg,image/webp">
            {(props) => <Button {...props} variant="outline" fullWidth size="xs">Choisir une image</Button>}
          </FileButton>
        </div>

        <div>
          <Text size="xs" fw={500} mb={4}>Cadrage & Zoom :</Text>
          <Group grow gap="xs">
            <Button size="xs" variant={bgZoom === 'cover' ? 'filled' : 'light'} onClick={() => handleZoomChange('cover')}>Remplir</Button>
            <Button size="xs" variant={bgZoom === '80%' ? 'filled' : 'light'} onClick={() => handleZoomChange('80%')}>Dézoomer</Button>
            <Button size="xs" variant={bgZoom === 'contain' ? 'filled' : 'light'} onClick={() => handleZoomChange('contain')}>Entière</Button>
          </Group>
        </div>

        <Group justify="space-between" mt="md" pt="xs" style={{ borderTop: '1px solid #334155' }}>
          <Button color="red" variant="subtle" size="xs" onClick={handleReset}>Réinitialiser</Button>
          <Button 
            size="xs" 
            onClick={async () => {
              try {
                await saveUserCustomization({
                  bgColor: localStorage.getItem('nesis_bg_color'),
                  bgImage: localStorage.getItem('nesis_bg_image'),
                  bgZoom: localStorage.getItem('nesis_bg_zoom') || 'cover',
                });
              } catch (error) {
                console.error("Erreur lors de la sauvegarde BDD :", error);
              }
              onClose();
            }}
          >
            Valider
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}