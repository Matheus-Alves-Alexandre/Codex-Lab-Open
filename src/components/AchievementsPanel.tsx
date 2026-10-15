import React, { useState } from 'react';
import { Trophy, ChevronRight, Lock } from 'lucide-react';
import { Achievement, ACHIEVEMENTS } from '../lib/achievementsList';
import { useAchievements } from '../hooks/useAchievements';

export function AchievementsPanel() {
  const { unlockedIds, unlockedAchievements, manualUnlock } = useAchievements();
  const [showAll, setShowAll] = useState(false);

  // Take the 3 most recently unlocked ones
  const latestUnlocked = unlockedAchievements.slice(-3).reverse();

  return (
    <div className="bento-card border border-border/50 w-full flex flex-col p-3 md:p-4 bg-dark-surface shadow-sm relative group overflow-hidden min-w-0">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4 border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
               <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
               <h3 className="font-bold text-[11px] md:text-sm tracking-widest uppercase text-foreground">Conquistas</h3>
            </div>
            <div className="text-[9px] md:text-[10px] text-gray-500 mono font-bold bg-dark border border-border px-2 py-0.5 rounded-full">
               {unlockedIds.length} / {ACHIEVEMENTS.length}
            </div>
        </div>

        {/* List of last unlocked */}
        <div className="flex flex-col gap-1.5 md:gap-2 flex-1 relative z-10">
           {latestUnlocked.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-4">
                 <Lock className="w-6 h-6 md:w-8 md:h-8 text-gray-600 mb-2" />
                 <p className="text-[10px] md:text-xs text-gray-400 font-mono">Nenhuma conquista ainda.<br/>Leia seu primeiro mangá!</p>
              </div>
           ) : (
             <>
               {latestUnlocked.map(ach => (
                 <div key={ach.id} className="flex gap-2.5 md:gap-3 items-center bg-dark/50 border border-border/50 p-1.5 md:p-2 rounded-lg group-hover:border-accent/30 transition-colors">
                    <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                       <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                       <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-accent font-bold">Nível: {ach.level}</span>
                       <h4 className="text-[11px] md:text-xs font-bold text-white truncate">{ach.title}</h4>
                       <p className="text-[9px] md:text-[10px] text-gray-400 truncate mt-0.5">{ach.description}</p>
                    </div>
                 </div>
               ))}
             </>
           )}
        </div>
        
        {/* Footer actions */}
        <button 
           onClick={() => setShowAll(true)}
           className="mt-3 md:mt-4 w-full py-1.5 md:py-2 bg-dark hover:bg-accent/10 border border-border rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-accent transition-colors flex items-center justify-center gap-1"
        >
            View All <span className="hidden md:inline">Achievements</span> <ChevronRight className="w-3 h-3" />
        </button>

        {/* Hidden manual unlocker for simulation purposes (dev helper) */}
        {latestUnlocked.length === 0 && (
           <button 
             onClick={() => manualUnlock('recruta_1')} 
             className="absolute top-2 right-2 w-4 h-4 opacity-0"
             title="Secret Unlocker"
           />
        )}
    </div>
  );
}
