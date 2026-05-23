"use client";

import { useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";
import { Modal } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";
import { LuX } from "react-icons/lu";

interface PosCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function PosCameraScanner({ isOpen, onClose, onScan }: PosCameraScannerProps) {
  const { language } = useTranslation();
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Debounce multiple scans of the same code
  const lastScannedTime = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      Quagga.stop();
      return;
    }

    if (!scannerRef.current) return;

    setError(null);
    lastScannedTime.current = 0;

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment", // Prioritize back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: navigator.hardwareConcurrency || 2,
        decoder: {
          readers: [
            "ean_reader", // Standard 13 digit EAN
            "ean_8_reader", // 8 digit EAN
            "code_128_reader", // Code 128
            "upc_reader", // Standard UPC
            "upc_e_reader", // UPC E
          ],
          multiple: false,
        },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error("Quagga initialization failed", err);
          setError(getLocalizedText("Camera access denied or unavailable. / تعذر الوصول للكاميرا.", language));
          return;
        }
        Quagga.start();
      }
    );

    const handleDetected = (result: any) => {
      if (result && result.codeResult && result.codeResult.code) {
        const now = Date.now();
        // Prevent scanning the exact same barcode multiple times per second
        if (now - lastScannedTime.current > 1500) {
          lastScannedTime.current = now;
          const code = result.codeResult.code;
          // Stop Quagga so we don't keep firing events while modal closes
          Quagga.stop();
          onScan(code);
        }
      }
    };

    Quagga.onDetected(handleDetected);

    return () => {
      Quagga.offDetected(handleDetected);
      Quagga.stop();
    };
  }, [isOpen, onScan, language]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        Quagga.stop();
        onClose();
      }}
      title={getLocalizedText("Scan Barcode / مسح الباركود", language)}
      className="max-w-md"
    >
      <div className="p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <LuX className="mb-4 h-10 w-10 text-red-500" />
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg border border-[#e4e9e6] bg-black">
            {/* The scanner viewport */}
            <div
              ref={scannerRef}
              className="quagga-viewport"
              style={{ width: "100%", position: "relative" }}
            />
            {/* Overlay a scanning line for UX */}
            <div className="pointer-events-none absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>
        )}
        <p className="mt-4 text-center text-sm text-[#596760]">
          {getLocalizedText("Position the barcode along the red line. / ضع الباركود على الخط الأحمر.", language)}
        </p>
      </div>
      
      {/* 
        Quagga injects video and canvas elements directly into our target ref.
        We need to ensure the video takes up 100% of the container. 
      */}
      <style>{`
        .quagga-viewport video {
          width: 100%;
          height: auto;
          display: block;
        }
        .quagga-viewport canvas.drawingBuffer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </Modal>
  );
}
