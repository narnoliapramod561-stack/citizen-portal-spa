"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function CapturePage() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Start camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        activeStream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startCamera();
    return () => {
      activeStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const runDetection = async (imageBase64: string) => {
    setIsDetecting(true);
    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageBase64 }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Detection error:", err);
      // Fallback in case of API failure
      setResult({
        plastic_type: "Unknown",
        recyclable: false,
        confidence: 0,
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL("image/jpeg");
        setCapturedImage(data);
        runDetection(data);
      }
    }
  };

  const mintPCU = async () => {
    if (!result) return;
    const { error } = await supabase.from("pcu").insert({
      plastic_type: String(result.plastic_type),
      recyclable: Boolean(result.recyclable),
      amount: 10,
      method: "PHOTO",
      confidence: Number(result.confidence),
    });

    if (!error) {
      router.push(`/map?type=${String(result.plastic_type)}`);
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
        <span className="font-bold tracking-tight">Photo AI</span>
        <div className="w-10"></div>
      </header>

      <div className="relative w-full aspect-[3/4] max-w-sm rounded-[40px] overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-2xl">
        {!capturedImage ? (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={capturedImage} alt="Captured surface" className="w-full h-full object-cover" />
        )}

        {isDetecting && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-emerald-400">Analyzing Surface...</p>
            <p className="text-sm text-slate-400 mt-2">Running Computer Vision Model v2.4</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-12 w-full max-w-sm">
        {!result ? (
          <button
            onClick={capturePhoto}
            disabled={isDetecting}
            className="w-full py-6 rounded-3xl bg-white text-black font-extrabold text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <div className="w-4 h-4 rounded-full border-2 border-black"></div>
            CAPTURE NOW
          </button>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Identification Success</span>
                <span className="text-emerald-400 text-xs font-bold">{(Number(result.confidence) * 100).toFixed(0)}% Conf.</span>
              </div>
              <h2 className="text-3xl font-black mb-1">{String(result.plastic_type)}</h2>
              <p className="text-sm text-slate-400">Recyclable: {result.recyclable ? "YES (Priority)" : "NO (Landfill)"}</p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => {setResult(null); setCapturedImage(null);}}
                className="flex-1 py-4 rounded-2xl bg-slate-900 font-bold border border-slate-800"
              >
                RETAKE
              </button>
              <button
                onClick={mintPCU}
                className="flex-[2] py-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
              >
                MINT 10 PCU
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
