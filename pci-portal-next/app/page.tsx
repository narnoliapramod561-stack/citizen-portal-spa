import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch PCU data from Supabase for the mini-dashboard
  const { data: pcuData } = await supabase
    .from('pcu')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg pointer-events-none opacity-20 blur-[120px] bg-gradient-to-b from-emerald-500/50 to-transparent"></div>

      <div className="relative max-w-xl mx-auto px-6 pt-12 pb-24 h-full flex flex-col items-center">
        {/* Header */}
        <header className="w-full mb-12 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">P</div>
            <span className="font-bold tracking-tight text-lg">PCI Portal</span>
          </div>
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Supabase Live</span>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            The Future of <br/>
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Plastic Credit.
            </span>
          </h1>
          <p className="mt-4 text-slate-400 max-w-sm mx-auto">
            Identify packaging instantly using AI or Barcode and mint your PCU credits.
          </p>
        </section>

        {/* Main Actions */}
        <section className="w-full grid grid-cols-1 gap-6 mb-16">
          <Link href="/capture" className="group relative overflow-hidden p-8 rounded-[32px] bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-2xl shadow-emerald-900/40 transform active:scale-[0.98] transition-all">
             <div className="relative z-10 flex flex-col h-full">
               <span className="text-sm font-bold text-emerald-200 uppercase tracking-widest mb-1">Method 01</span>
               <h3 className="text-3xl font-bold mb-4">Photo AI</h3>
               <p className="text-emerald-100/70 text-sm max-w-[200px]">Capture an image and let AI identify the plastic type instantly.</p>
             </div>
             <div className="absolute top-1/2 -right-4 -translate-y-1/2 text-[120px] font-black text-white/10 group-hover:scale-110 transition-transform select-none">SCAN</div>
          </Link>

          <Link href="/scan" className="group relative overflow-hidden p-8 rounded-[32px] bg-slate-900 border border-slate-800 shadow-xl transform active:scale-[0.98] transition-all hover:border-slate-700">
             <div className="relative z-10 flex flex-col h-full">
               <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Method 02</span>
               <h3 className="text-3xl font-bold mb-4">Barcode Scan</h3>
               <p className="text-slate-400 text-sm max-w-[200px]">Scan a product barcode for instant identification from our DB.</p>
             </div>
             <div className="absolute top-1/2 -right-4 -translate-y-1/2 text-[120px] font-black text-white/5 group-hover:scale-110 transition-transform select-none">CODE</div>
          </Link>
        </section>

        {/* Mini Dashboard Footer */}
        <section className="w-full mt-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-400">Your Activity</h2>
            <Link href="/dashboard" className="text-xs text-emerald-400 font-bold hover:underline">Full Report</Link>
          </div>
          <div className="space-y-3">
            {pcuData && pcuData.length > 0 ? pcuData.map((pcu: Record<string, unknown>) => (
              <div key={String(pcu.id)} className="p-4 bg-slate-900/50 border border-slate-800/50 rounded-2xl flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg">{pcu.method === 'PHOTO' ? '📸' : '🏷️'}</div>
                  <div>
                    <div className="font-bold text-sm tracking-tight">{String(pcu.plastic_type || 'Unknown')}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">{new Date(String(pcu.created_at)).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-emerald-400 font-bold">+{Number(pcu.amount)} PCU</div>
              </div>
            )) : (
              <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                 <p className="text-sm text-slate-600">No recent activity. Start by scanning!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
