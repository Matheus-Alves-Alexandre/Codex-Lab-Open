import React from 'react';
import { Trophy } from 'lucide-react';
import { Achievement } from '../lib/achievementsList';

interface AchievementToastProps {
  achievement: Achievement | null;
}

export function AchievementToast({ achievement }: AchievementToastProps) {
  if (!achievement) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
      <div className="bg-dark border border-accent rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] p-4 flex items-start gap-4 max-w-sm relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="shrink-0 w-12 h-12 bg-accent/10 border border-accent/50 rounded-full flex items-center justify-center text-accent relative mt-1">
           <Trophy className="w-6 h-6" />
        </div>
        
        <div className="flex flex-col relative z-10">
           <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-0.5">
             Conquista Desbloqueada!
           </span>
           <h4 className="text-sm font-bold text-white leading-tight">
             {achievement.title}
           </h4>
           <div className="flex items-center gap-2 mt-1 mb-1">
              <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 border border-border px-1.5 py-0.5 rounded-sm">
                Nível: {achievement.level}
              </span>
           </div>
           <p className="text-xs text-gray-300 font-serif leading-snug">
             {achievement.description}
           </p>
        </div>
      </div>
    </div>
  );
}
