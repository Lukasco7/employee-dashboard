'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number | string;
  stock: number;
  barcode: string | null;
}

interface BarcodeScannerProps {
  onBack: () => void;
  onProducts: () => void;
}

type ScannerState =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'stopping';

const LOW_STOCK_THRESHOLD = 10;

export default function BarcodeScanner({
  onBack,
  onProducts,
}: BarcodeScannerProps) {
  const cameraScannerRef =
    useRef<Html5Qrcode | null>(null);

  const fileScannerRef =
    useRef<Html5Qrcode | null>(null);

  const processingScanRef =
    useRef(false);

  const [scannerState, setScannerState] =
    useState<ScannerState>('idle');

  const [cameras, setCameras] = useState<
    Array<{ id: string; label: string }>
  >([]);

  const [selectedCameraId, setSelectedCameraId] =
    useState('');

  const [cameraLoading, setCameraLoading] =
    useState(false);

  const [manualBarcode, setManualBarcode] =
    useState('');

  const [scannedBarcode, setScannedBarcode] =
    useState('');

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [showRegister, setShowRegister] =
    useState(false);

  const [imageLoading, setImageLoading] =
    useState(false);

  const [newProductName, setNewProductName] =
    useState('');

  const [newProductCategory, setNewProductCategory] =
    useState('');

  const [newProductPrice, setNewProductPrice] =
    useState('');

  const [newProductStock, setNewProductStock] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  // =========================
  // STOP CAMERA
  // =========================

  const stopScanner = async () => {
    const scanner =
      cameraScannerRef.current;

    if (!scanner) {
      setScannerState('idle');
      processingScanRef.current = false;
      return;
    }

    try {
      setScannerState('stopping');

      if (scanner.isScanning) {
        await scanner.stop();
      }

      try {
        scanner.clear();
      } catch {
        // Scanner UI may already be cleared.
      }
    } catch (err) {
      console.error(
        'Error stopping camera scanner:',
        err
      );
    } finally {
      cameraScannerRef.current = null;
      processingScanRef.current = false;
      setScannerState('idle');
    }
  };

  // =========================
  // COMPONENT CLEANUP
  // =========================

  useEffect(() => {
    return () => {
      const cameraScanner =
        cameraScannerRef.current;

      if (cameraScanner) {
        if (cameraScanner.isScanning) {
          cameraScanner.stop().catch(() => {});
        }

        try {
          cameraScanner.clear();
        } catch {
          // Ignore cleanup errors.
        }
      }

      const fileScanner =
        fileScannerRef.current;

      if (fileScanner) {
        try {
          fileScanner.clear();
        } catch {
          // Ignore cleanup errors.
        }
      }
    };
  }, []);

  // =========================
  // FIND PRODUCT
  // =========================

  const findProductByBarcode = async (
    barcodeValue: string
  ) => {
    const cleanBarcode =
      barcodeValue.trim();

    if (!cleanBarcode) {
      setError(
        'Please enter or scan a barcode.'
      );
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');
      setProduct(null);
      setShowRegister(false);
      setScannedBarcode(cleanBarcode);

      const {
        data,
        error: searchError,
      } = await supabase
        .from('products')
        .select(
          'id, name, category, price, stock, barcode'
        )
        .eq('barcode', cleanBarcode)
        .maybeSingle();

      if (searchError) {
        throw searchError;
      }

      // =========================
      // FOUND IN OUR INVENTORY
      // =========================

      if (data) {
        setProduct({
          id: Number(data.id),
          name:
            data.name ||
            'Unnamed Product',
          category:
            data.category ||
            'Uncategorized',
          price:
            Number(
              String(data.price)
                .replace('$', '')
                .trim()
            ) || 0,
          stock:
            Number(data.stock) || 0,
          barcode:
            data.barcode || null,
        });

        setManualBarcode(
          cleanBarcode
        );

        setMessage(
          'Product found in your inventory.'
        );

        return;
      }

      // =========================
      // NOT FOUND -> EXTERNAL API
      // =========================

      setMessage(
        `Barcode ${cleanBarcode} is not in your inventory. Checking product database...`
      );

      try {
        const response =
          await fetch(
            `/api/barcode-lookup?barcode=${encodeURIComponent(
              cleanBarcode
            )}`,
            {
              method: 'GET',
              cache: 'no-store',
            }
          );

        const externalData =
          await response.json();

        if (!response.ok) {
          throw new Error(
            externalData?.error ||
              'External barcode lookup failed.'
          );
        }

        if (
          externalData.found &&
          externalData.product
        ) {
          setNewProductName(
            externalData.product.name ||
              ''
          );

          setNewProductCategory(
            externalData.product.category ||
              ''
          );

          setShowRegister(true);

          setMessage(
            'Product information was found. Review it before adding it to inventory.'
          );

          return;
        }

        setShowRegister(true);

        setMessage(
          `Barcode ${cleanBarcode} was not found in your inventory or the external product database.`
        );
      } catch (externalError) {
        console.error(
          'External product lookup error:',
          externalError
        );

        setShowRegister(true);

        setMessage(
          `Barcode ${cleanBarcode} was not found in your inventory. Please enter the product information manually.`
        );
      }
    } catch (err) {
      console.error(
        'Barcode lookup error:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to search barcode: ${err.message}`
        );
      } else {
        setError(
          'Unable to search barcode.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD CAMERAS
  // =========================

  const loadCameras = async () => {
    const devices =
      await Html5Qrcode.getCameras();

    if (!devices || devices.length === 0) {
      throw new Error(
        'No camera was found on this device.'
      );
    }

    const normalized = devices.map(
      (device) => ({
        id: device.id,
        label:
          device.label ||
          `Camera ${device.id.slice(0, 6)}`,
      })
    );

    setCameras(normalized);

    // Prefer a rear/back camera where
    // the browser provides a useful label.
    const preferred =
      normalized.find((camera) =>
        /back|rear|environment/i.test(
          camera.label
        )
      ) || normalized[0];

    setSelectedCameraId(
      (current) =>
        current ||
        preferred.id
    );

    return normalized;
  };

  // =========================
  // START CAMERA
  // =========================

  const startScanner = async () => {
    setError('');
    setMessage('');
    setProduct(null);
    setShowRegister(false);
    processingScanRef.current = false;

    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        'Camera access is not available in this browser. Please use manual entry or image scanning.'
      );
      return;
    }

    if (!window.isSecureContext) {
      setError(
        'Camera scanning requires HTTPS or localhost.'
      );
      return;
    }

    try {
      setCameraLoading(true);
      setScannerState('starting');

      if (
        cameraScannerRef.current
      ) {
        await stopScanner();
      }

      const devices =
        cameras.length > 0
          ? cameras
          : await loadCameras();

      const cameraId =
        selectedCameraId ||
        devices[0]?.id;

      if (!cameraId) {
        throw new Error(
          'No camera is available.'
        );
      }

      const scanner =
        new Html5Qrcode(
          'barcode-reader',
          {
            verbose: false,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.ITF,
            ],
          }
        );

      cameraScannerRef.current =
        scanner;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: {
            width: 360,
            height: 180,
          },
          aspectRatio: 1.777778,
          disableFlip: false,
        },
        async (decodedText) => {
          if (
            processingScanRef.current
          ) {
            return;
          }

          const barcode =
            decodedText.trim();

          if (!barcode) {
            return;
          }

          processingScanRef.current = true;

          console.log(
            'BARCODE DETECTED:',
            barcode
          );

          await stopScanner();

          setManualBarcode(barcode);

          await findProductByBarcode(
            barcode
          );
        },
        (scanError) => {
          // Keep this quiet during normal
          // frame-by-frame scanning.
          void scanError;
        }
      );

      setScannerState('scanning');

      setMessage(
        'Camera is active. Center the barcode inside the scan box and hold steady.'
      );
    } catch (err) {
      console.error(
        'Camera scanner error:',
        err
      );

      cameraScannerRef.current =
        null;

      processingScanRef.current = false;

      setScannerState('idle');

      if (
        err instanceof DOMException &&
        err.name === 'NotAllowedError'
      ) {
        setError(
          'Camera permission was denied. Allow camera access and try again.'
        );
      } else if (
        err instanceof Error
      ) {
        setError(
          `Unable to start scanner: ${err.message}`
        );
      } else {
        setError(
          'Unable to start the barcode scanner.'
        );
      }
    } finally {
      setCameraLoading(false);
    }
  };

  // =========================
  // IMAGE SCANNING
  // =========================

  const handleImageScan = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    e.target.value = '';

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith('image/')
    ) {
      setError(
        'Please choose an image file.'
      );
      return;
    }

    setError('');
    setMessage('');
    setProduct(null);
    setShowRegister(false);

    try {
      setImageLoading(true);

      if (
        cameraScannerRef.current
      ) {
        await stopScanner();
      }

      const scanner =
        new Html5Qrcode(
          'barcode-file-reader',
          {
            verbose: false,
          }
        );

      fileScannerRef.current =
        scanner;

      setMessage(
        'Reading barcode from image...'
      );

      const decodedText =
        await scanner.scanFile(
          file,
          false
        );

      console.log(
        'BARCODE DETECTED FROM IMAGE:',
        decodedText
      );

      try {
        scanner.clear();
      } catch {
        // Ignore clear errors.
      }

      fileScannerRef.current = null;

      setManualBarcode(
        decodedText
      );

      await findProductByBarcode(
        decodedText
      );
    } catch (err) {
      console.error(
        'Image barcode scan error:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Could not read a barcode from that image: ${err.message}`
        );
      } else {
        setError(
          'Could not read a barcode from that image.'
        );
      }
    } finally {
      setImageLoading(false);
    }
  };

  // =========================
  // REGISTER PRODUCT
  // =========================

  const handleRegisterProduct = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setMessage('');

    const cleanName =
      newProductName.trim();

    const cleanCategory =
      newProductCategory.trim();

    const price =
      Number(newProductPrice);

    const stock =
      Number(newProductStock);

    if (!scannedBarcode) {
      setError(
        'No barcode has been captured.'
      );
      return;
    }

    if (
      !cleanName ||
      !cleanCategory
    ) {
      setError(
        'Please enter the product name and category.'
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError(
        'Please enter a valid price.'
      );
      return;
    }

    if (
      !Number.isFinite(stock) ||
      stock < 0 ||
      !Number.isInteger(stock)
    ) {
      setError(
        'Stock must be a whole number.'
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from('products')
        .select('id')
        .eq(
          'barcode',
          scannedBarcode
        )
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        setError(
          'This barcode is already assigned to a product.'
        );
        return;
      }

      const {
        data,
        error: insertError,
      } = await supabase
        .from('products')
        .insert({
          name: cleanName,
          category: cleanCategory,
          price,
          stock,
          barcode:
            scannedBarcode,
        })
        .select(
          'id, name, category, price, stock, barcode'
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      if (data) {
        setProduct({
          id: Number(data.id),
          name:
            data.name ||
            cleanName,
          category:
            data.category ||
            cleanCategory,
          price:
            Number(
              String(data.price)
                .replace('$', '')
                .trim()
            ) || 0,
          stock:
            Number(data.stock) || 0,
          barcode:
            data.barcode ||
            scannedBarcode,
        });
      }

      setShowRegister(false);

      setMessage(
        'Product was added to your inventory successfully.'
      );

      setNewProductName('');
      setNewProductCategory('');
      setNewProductPrice('');
      setNewProductStock('');
    } catch (err) {
      console.error(
        'Register product error:',
        err
      );

      if (err instanceof Error) {
        setError(
          `Unable to register product: ${err.message}`
        );
      } else {
        setError(
          'Unable to register product.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // RESET
  // =========================

  const resetScanner = async () => {
    await stopScanner();

    if (
      fileScannerRef.current
    ) {
      try {
        fileScannerRef.current.clear();
      } catch {
        // Ignore.
      }

      fileScannerRef.current = null;
    }

    setManualBarcode('');
    setScannedBarcode('');
    setProduct(null);
    setError('');
    setMessage('');
    setShowRegister(false);

    setNewProductName('');
    setNewProductCategory('');
    setNewProductPrice('');
    setNewProductStock('');
  };

  // =========================
  // PRICE
  // =========================

  const formatPrice = (
    value: number | string
  ) => {
    const numericValue =
      Number(
        String(value)
          .replace('$', '')
          .trim()
      );

    return Number.isFinite(
      numericValue
    )
      ? numericValue.toFixed(2)
      : '0.00';
  };

  // =========================
  // STOCK
  // =========================

  const getStockLabel = (
    stock: number
  ) => {
    if (stock <= 0) {
      return 'Out of Stock';
    }

    if (
      stock <=
      LOW_STOCK_THRESHOLD
    ) {
      return 'Low Stock';
    }

    return 'In Stock';
  };

  const getStockClass = (
    stock: number
  ) => {
    if (stock <= 0) {
      return 'bg-red-100 text-red-800';
    }

    if (
      stock <=
      LOW_STOCK_THRESHOLD
    ) {
      return 'bg-orange-100 text-orange-800';
    }

    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <header className="bg-white shadow">

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Barcode Scanner
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Scan a barcode, find the product,
              or register a new one.
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium cursor-pointer"
          >
            ← Back to Dashboard
          </button>

        </div>

      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ========================= */}
        {/* CAMERA */}
        {/* ========================= */}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-5">

            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">
                Camera Scanner
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Choose a camera, then scan the
                printed barcode.
              </p>
            </div>

            {cameras.length > 0 && (
              <div className="w-full lg:w-80">

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Camera
                </label>

                <select
                  value={
                    selectedCameraId
                  }
                  onChange={(e) =>
                    setSelectedCameraId(
                      e.target.value
                    )
                  }
                  disabled={
                    scannerState ===
                    'scanning'
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {cameras.map(
                    (camera) => (
                      <option
                        key={
                          camera.id
                        }
                        value={
                          camera.id
                        }
                      >
                        {camera.label}
                      </option>
                    )
                  )}
                </select>

              </div>
            )}

          </div>

          <div className="bg-black rounded-xl overflow-hidden">

            <div
              id="barcode-reader"
              className="w-full min-h-[360px]"
            />

          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">

            {scannerState ===
            'scanning' ? (
              <button
                type="button"
                onClick={
                  stopScanner
                }
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-semibold cursor-pointer"
              >
                Stop Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  startScanner
                }
                disabled={
                  cameraLoading
                }
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {cameraLoading
                  ? 'Starting Camera...'
                  : '📷 Start Camera'}
              </button>
            )}

            <button
              type="button"
              onClick={
                resetScanner
              }
              disabled={
                scannerState ===
                  'starting' ||
                scannerState ===
                  'stopping'
              }
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50 cursor-pointer"
            >
              Reset
            </button>

          </div>

          <p className="text-sm text-gray-500 mt-4">
            For best results, use a clear printed
            barcode, good lighting, and keep the
            barcode steady inside the scan area.
          </p>

        </div>

        {/* Hidden element used for image decoding */}

        <div
          id="barcode-file-reader"
          className="hidden"
          aria-hidden="true"
        />

        {/* ========================= */}
        {/* IMAGE SCAN */}
        {/* ========================= */}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Scan from Image
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Take a clear photo of the barcode and
            upload it here if the camera scanner
            has difficulty reading it.
          </p>

          <label className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 px-5 py-3 rounded-lg hover:bg-indigo-200 transition font-semibold cursor-pointer">

            {imageLoading
              ? 'Reading Image...'
              : '🖼️ Choose Barcode Image'}

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={
                handleImageScan
              }
              disabled={imageLoading}
              className="hidden"
            />

          </label>

        </div>

        {/* ========================= */}
        {/* MANUAL ENTRY */}
        {/* ========================= */}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Manual Barcode Entry
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Enter the barcode number directly if
            the camera or image scan cannot read it.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();

              findProductByBarcode(
                manualBarcode
              );
            }}
            className="flex flex-col sm:flex-row gap-3"
          >

            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={
                manualBarcode
              }
              onChange={(e) =>
                setManualBarcode(
                  e.target.value
                )
              }
              placeholder="Enter barcode number"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? 'Searching...'
                : '🔎 Search'}
            </button>

          </form>

        </div>

        {/* ========================= */}
        {/* ERROR */}
        {/* ========================= */}

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* ========================= */}
        {/* MESSAGE */}
        {/* ========================= */}

        {message && (
          <div className="bg-green-100 border border-green-200 text-green-700 rounded-lg p-4 mb-6">
            {message}
          </div>
        )}

        {/* ========================= */}
        {/* FOUND PRODUCT */}
        {/* ========================= */}

        {product && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">

              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Product Found
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Barcode:{' '}
                  <span className="font-semibold text-gray-800">
                    {product.barcode}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={
                  onProducts
                }
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-semibold cursor-pointer"
              >
                View Products
              </button>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <p className="text-sm text-gray-500">
                  Product Name
                </p>

                <p className="text-xl font-semibold text-gray-800 mt-1">
                  {product.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Category
                </p>

                <p className="text-xl font-semibold text-gray-800 mt-1">
                  {product.category}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Price
                </p>

                <p className="text-xl font-semibold text-gray-800 mt-1">
                  {formatCurrency(
                    product.price
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Current Stock
                </p>

                <p className="text-xl font-semibold text-gray-800 mt-1">
                  {product.stock}
                </p>
              </div>

            </div>

            <div className="mt-6">
              <span
                className={`inline-block px-4 py-2 rounded-lg font-semibold ${getStockClass(
                  product.stock
                )}`}
              >
                {getStockLabel(
                  product.stock
                )}
              </span>
            </div>

          </div>
        )}

        {/* ========================= */}
        {/* UNKNOWN BARCODE */}
        {/* ========================= */}

        {showRegister && (
          <div className="bg-white rounded-xl shadow-sm p-6">

            <h2 className="text-xl font-bold text-gray-800">
              Add Product to Inventory
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-4">
              We couldn't find this barcode in your
              inventory. Review the information below
              before saving it.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">

              <p className="text-sm text-gray-500">
                Barcode
              </p>

              <p className="text-lg font-bold text-gray-800 mt-1 break-all">
                {scannedBarcode}
              </p>

            </div>

            <form
              onSubmit={
                handleRegisterProduct
              }
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>

                <input
                  type="text"
                  value={
                    newProductName
                  }
                  onChange={(e) =>
                    setNewProductName(
                      e.target.value
                    )
                  }
                  placeholder="Product name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>

                <input
                  type="text"
                  value={
                    newProductCategory
                  }
                  onChange={(e) =>
                    setNewProductCategory(
                      e.target.value
                    )
                  }
                  placeholder="Category"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    newProductPrice
                  }
                  onChange={(e) =>
                    setNewProductPrice(
                      e.target.value
                    )
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    newProductStock
                  }
                  onChange={(e) =>
                    setNewProductStock(
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2 flex gap-3 pt-2">

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving
                    ? 'Adding...'
                    : '✅ Add to Inventory'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowRegister(
                      false
                    )
                  }
                  disabled={saving}
                  className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>
        )}

      </main>

    </div>
  );
}
