import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Manga } from '../types/mangadex';

interface ReadingStatsRadarProps {
  mangas: Manga[];
}

export function ReadingStatsRadar({ mangas }: ReadingStatsRadarProps) {
  const data = useMemo(() => {
    const genreCounts: Record<string, number> = {};

    mangas.forEach(manga => {
      const tags = manga.attributes?.tags || [];
      tags.forEach((tag: any) => {
        const name = tag.attributes?.name?.en;
        if (name) {
          // Exclude Demographics or mostly meta-tags if needed, but for now we take all, or map them down to top 5
          genreCounts[name] = (genreCounts[name] || 0) + 1;
        }
      });
    });

    // We want to reduce it to some broad categories to match a goal tracker
    // Instead of raw genres, let's map tags to a RPG-like stats
    // Examples: 
    // "Action", "Adventure", "Martial Arts" -> Physical / Strength
    // "Mystery", "Psychological", "Sci-Fi" -> Intelligence / Brain
    // "Romance", "Drama", "Slice of Life" -> Emotional / Heart
    // "Fantasy", "Magic", "Supernatural" -> Magic / Imagination
    // Let's use 4 or 5 axes for a radar.
    
    // User asked for "temas dos mangas que a pessoa mais le baseado nos favoritos"
    // So let's just pick the Top 4 or Top 5 genres read.
    const sortedGenres = Object.entries(genreCounts)
       .map(([subject, A]) => ({ subject, A, fullMark: 100 }))
       .sort((a, b) => b.A - a.A)
       .slice(0, 5); // Pick top 5

    // If less than 3, the radar chart looks like a line or point, so we pad it.
    if (sortedGenres.length === 0) {
      return [
         { subject: 'Action', A: 0, fullMark: 100 },
         { subject: 'Romance', A: 0, fullMark: 100 },
         { subject: 'Comedy', A: 0, fullMark: 100 },
         { subject: 'Fantasy', A: 0, fullMark: 100 },
         { subject: 'Drama', A: 0, fullMark: 100 }
      ];
    }
    
    while (sortedGenres.length < 4) {
       sortedGenres.push({ subject: 'Misc ' + sortedGenres.length, A: 0, fullMark: 100 });
    }

    // Normalize A so the chart looks good
    const maxA = Math.max(...sortedGenres.map(g => g.A), 1);
    return sortedGenres.map(g => ({
       ...g,
       fullMark: maxA,
    }));
  }, [mangas]);

  return (
    <div className="w-full h-[180px] md:h-[300px] flex flex-col items-center justify-center p-2 md:p-4">
      <div className="text-center mb-[-20px] z-10 hidden">
         <h3 className="font-bold text-sm tracking-widest uppercase text-foreground">Reading Traits</h3>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid stroke="#333" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10, fontWeight: 'bold' }} />
          <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
          
          <Tooltip 
             contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
             itemStyle={{ color: '#F97316' }} // primary accent orange
          />

          {/* Using primary/accent colors based on the requested orange (Tailwind: #f97316 for 'accent' often) */}
          <Radar 
             name="Reads" 
             dataKey="A" 
             stroke="#F97316" 
             fill="#F97316" 
             fillOpacity={0.4} 
             dot={{ r: 3, fill: "#F97316", fillOpacity: 1 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
