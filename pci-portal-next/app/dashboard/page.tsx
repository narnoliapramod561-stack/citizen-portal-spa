"use client";

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PCU {
  id: string;
  plastic_type: string;
  amount: number;
  method: string;
  created_at: string;
}

export default function DashboardPage() {
  const [pcuData, setPcuData] = useState<PCU[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('pcu')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setPcuData(data);
    }
    loadData();
  }, [supabase]);

  const totalCredits = pcuData.reduce((acc, item) => acc + (item.amount || 0), 0);
  const targetPcu = 1000;
  
  const breakdown: Record<string, number> = pcuData.reduce((acc, item) => {
    const type = item.plastic_type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = {
    labels: ['Compliance Progress'],
    datasets: [
      {
        label: 'Achieved',
        data: [totalCredits],
        backgroundColor: '#10b981',
        borderRadius: 8,
      },
      {
        label: 'Target',
        data: [targetPcu],
        backgroundColor: '#1e293b',
        borderRadius: 8,
      },
    ],
  };

  const doughnutData = {
    labels: Object.keys(breakdown),
    datasets: [
      {
        data: Object.values(breakdown),
        backgroundColor: ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 pb-32">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Compliance Intelligence
        </h1>
        <p className="text-slate-400 text-sm italic">Urban Intelligence Grid | Real-time EPR Tracking</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
           <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Minted</div>
           <div className="text-3xl font-black">{totalCredits.toFixed(1)} <span className="text-xs font-normal text-slate-500">PCU</span></div>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
           <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Compliance</div>
           <div className="text-3xl font-black text-emerald-400">{((totalCredits / targetPcu) * 100).toFixed(1)}%</div>
        </div>
      </div>

      <div className="space-y-8">
        <section className="p-8 bg-slate-900 border border-slate-800 rounded-[40px]">
          <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
            Target vs. Achieved
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Q1 2026</span>
          </h3>
          <div className="h-24">
            <Bar data={barData} options={{ indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, maintainAspectRatio: false }} />
          </div>
          <p className="mt-4 text-xs text-slate-500 text-center">You have achieved {totalCredits.toFixed(1)} PCU towards the 1,000 PCU target.</p>
        </section>

        <section className="p-8 bg-slate-900 border border-slate-800 rounded-[40px]">
          <h3 className="text-lg font-bold mb-6 text-center">Material Breakdown</h3>
          <div className="max-w-[200px] mx-auto">
            <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } } }} />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2">
             {Object.keys(breakdown).map((type, i) => (
               <div key={type} className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: doughnutData.datasets[0].backgroundColor[i] }}></div>
                  {type} ({breakdown[type]})
               </div>
             ))}
          </div>
        </section>
      </div>

      <section className="mt-12 overflow-x-auto">
         <h3 className="font-bold text-slate-400 pl-2 mb-4">Recent Transactions</h3>
         <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-xs">
               <tbody className="divide-y divide-slate-800">
                  {pcuData.slice(0, 5).map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-mono text-slate-500">{p.id.slice(0, 8)}</td>
                        <td className="px-6 py-4 font-bold">{p.plastic_type}</td>
                        <td className="px-6 py-4 text-emerald-400">+{p.amount}</td>
                      </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>
    </main>
  );
}
