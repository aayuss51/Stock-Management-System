import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import Quagga from 'quagga';

const BarcodeScanner = ({ onScan, onClose, isOpen }) => {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [scanStatus, setScanStatus] = useState(''); // 'success', 'error', ''

  useEffect(() => {
    if (isOpen && scannerRef.current) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = () => {
    if (isScanning) return;

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment" // Use back camera
        },
      },
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_39_vin_reader",
          "codabar_reader",
          "upc_reader",
          "upc_e_reader",
          "i2of5_reader"
        ]
      },
      locate: true,
      locator: {
        patchSize: "medium",
        halfSample: true
      }
    }, (err) => {
      if (err) {
        console.error('Error initializing Quagga:', err);
        setScanStatus('error');
        return;
      }
      console.log("Initialization finished. Ready to start");
      Quagga.start();
      setIsScanning(true);
    });

    Quagga.onDetected((data) => {
      const code = data.codeResult.code;
      if (code && code !== lastScannedCode) {
        setLastScannedCode(code);
        setScanStatus('success');
        
        // Call the onScan callback with the scanned code
        if (onScan) {
          onScan(code);
        }
        
        // Reset status after 2 seconds
        setTimeout(() => {
          setScanStatus('');
        }, 2000);
      }
    });
  };

  const stopScanner = () => {
    if (isScanning) {
      Quagga.stop();
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    stopScanner();
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Scan Barcode</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="relative">
          <div 
            ref={scannerRef}
            className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center"
          >
            {!isScanning && (
              <div className="text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Initializing camera...</p>
              </div>
            )}
          </div>
          
          {/* Scan overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-primary-500 rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
            </div>
          </div>
        </div>

        {/* Status messages */}
        {scanStatus === 'success' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm text-green-800">
              Barcode scanned successfully: {lastScannedCode}
            </span>
          </div>
        )}

        {scanStatus === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm text-red-800">
              Camera initialization failed. Please check permissions.
            </span>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Position the barcode within the frame to scan
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
