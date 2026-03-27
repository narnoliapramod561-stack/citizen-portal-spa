"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Award, Shield, Zap, TrendingUp, Settings } from "lucide-react";

export default function ProfilePage() {
  const [stats, setStats] = useState<{total: number, count: number}>({ total: 0, count: 0 });
  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase.from('pcu').select('amount');
      if (data) {
        setStats({
          total: data.reduce((acc: number, cur: Record<string, unknown>) => acc + Number(cur.amount || 0), 0),
          count: data.length
        });
      }
    }
    loadStats();
  }, [supabase]);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 pb-32">
       <header className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight">Citizen Profile</h1>
          <button className="p-2 text-slate-500 hover:text-white"><Settings className="w-6 h-6" /></button>
       </header>

       <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 p-1 mb-4 shadow-xl shadow-emerald-500/20">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-4xl">🌱</div>
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Subham Kumar</h2>
          <div className="mt-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-black uppercase tracking-widest">
            Level 12 Eco-Warrior
          </div>
       </div>

       <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[32px] text-center">
            <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="text-3xl font-black">{stats.total.toFixed(1)}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lifetime PCU</div>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-[32px] text-center">
            <Zap className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
            <div className="text-3xl font-black">{stats.count}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Actions</div>
          </div>
       </div>

       <section className="space-y-4">
          <h3 className="font-bold text-slate-400 pl-2">Active Badges</h3>
          <div className="space-y-3">
             <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><Award /></div>
                    <div>
                        <div className="font-bold text-sm">Early Adopter</div>
                        <div className="text-xs text-slate-500">Joined in Q1 2026</div>
                    </div>
                </div>
                <div className="text-orange-500 text-xs font-bold uppercase">Gold</div>
             </div>

             <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between opacity-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500"><Shield /></div>
                    <div>
                        <div className="font-bold text-sm">Compliance Guardian</div>
                        <div className="text-xs text-slate-500">Reach 500 PCU to unlock</div>
                    </div>
                </div>
             </div>
          </div>
       </section>
    </main>
  );
}
