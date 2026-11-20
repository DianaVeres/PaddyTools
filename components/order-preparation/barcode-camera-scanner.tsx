'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser';
import { ScanBarcode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BarcodeCameraScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);
  const [message, setMessage] = useState(
    'Apunta la cámara al código de barras del producto.',
  );

  useEffect(() => {
    if (!videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    void reader
      .decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result) => {
          if (!result || cancelled || handledRef.current) return;
          handledRef.current = true;
          controlsRef.current?.stop();
          onScan(result.getText());
        },
      )
      .then((controls) => {
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(
          error instanceof Error &&
            /permission|allowed|denied/i.test(error.message)
            ? 'No hay permiso para usar la cámara. Actívalo en los ajustes de Safari para PaddyTools.'
            : 'No se pudo abrir la cámara. Comprueba que ninguna otra aplicación la esté usando.',
        );
      });
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onScan]);

  return (
    <div
      className="barcode-camera-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Escanear código de barras"
    >
      <section className="barcode-camera-dialog">
        <header>
          <div>
            <ScanBarcode />
            <span>
              <b>Escanear producto</b>
              <small>EAN, Code 128 y otros códigos habituales</small>
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar lector">
            <X />
          </button>
        </header>
        <div className="barcode-camera-preview">
          <video ref={videoRef} muted playsInline />
          <span aria-hidden="true" />
        </div>
        <p>{message}</p>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </section>
    </div>
  );
}
