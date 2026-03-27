"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// html5-qrcode imported dynamically inside useEffect to prevent SSR window not defined errors
import { createClient } from "@/utils/supabase/client";

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(true);
  const [scannedData, setScannedData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const lookupBarcode = async (barcode: string) => {
      setIsLoading(true);
      try {
        const { data: product } = await supabase
          .from("products")
          .select("*")
          .eq("barcode", barcode)
          .single();

        if (product) {
          setScannedData({ ...product, found: true });
        } else {
          setScannedData({
            barcode,
            product_name: "Generic Package",
            brand: "Unknown",
            plastic_type: "PET",
            recyclable: true,
            found: false,
          });
        }
      } catch (err) {
        console.error("Lookup error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isScanning) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let scanner: any;
      import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
        scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        function onScanSuccess(decodedText: string) {
          scanner.clear();
          setIsScanning(false);
          lookupBarcode(decodedText);
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function onScanError(err: unknown) {
          // ignore
        }

        scanner.render(onScanSuccess, onScanError);
      }).catch(err => console.error("Failed to load scanner", err));

      return () => {
        if (scanner) scanner.clear();
      };
    }
  }, [isScanning, supabase]);



  const mintPCU = async () => {
    if (!scannedData) return;
    const { error } = await supabase.from("pcu").insert({
      plastic_type: scannedData.plastic_type,
      recyclable: scannedData.recyclable,
      amount: 15,
      method: "BARCODE",
      barcode: scannedData.barcode,
    });

    if (!error) {
      router.push(`/map?type=${scannedData.plastic_type}`);
    } else {
      alert("Error minting PCU: " + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <header className="w-full flex justify-between items-center mb-8">
        <Link href="/" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
          ✕
        </Link>
        <span className="font-bold tracking-tight">Scanner</span>
        <div className="w-10"></div>
      </header>

      <div className="relative w-full max-w-sm rounded-[40px] overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-2xl min-h-[400px]">
        {isScanning && <div id="reader" className="w-full h-full"></div>}

        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-10">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-cyan-400">Searching Database...</p>
          </div>
        )}

        {scannedData && !isLoading && !isScanning && (
          <div className="p-8 h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-4xl mb-6">🏷️</div>
            <h2 className="text-2xl font-black mb-2">{String(scannedData.product_name || '')}</h2>
            <p className="text-slate-500 font-bold text-sm uppercase mb-6">{String(scannedData.brand || '')}</p>
            
            <div className="w-full grid grid-cols-2 gap-3 mb-8">
              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Type</div>
                <div className="font-bold text-cyan-400">{String(scannedData.plastic_type || '')}</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Recyclable</div>
                <div className="font-bold text-emerald-400">{scannedData.recyclable ? 'YES' : 'NO'}</div>
              </div>
            </div>

            <div className="flex gap-4 w-full">
               <button onClick={() => setIsScanning(true)} className="flex-1 py-4 bg-slate-800 rounded-2xl font-bold">RETRY</button>
               <button onClick={mintPCU} className="flex-1 py-4 bg-cyan-600 rounded-2xl font-bold">MINT 15 PCU</button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-12 text-center text-slate-500 text-sm max-w-[250px] mx-auto">
        Scan the barcode on any plastic packaging to identify it instantly.
      </p>
    </main>
  );
}
