import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Chapter } from "../types/mangadex";
import { useLibrary } from "../hooks/useLibrary";

interface ChapterListProps {
  chapters: Chapter[];
  mangaId?: string; // made optional for backwards compatibility, but passed from MangaDetail
}

export function ChapterList({ chapters, mangaId }: ChapterListProps) {
  const { library } = useLibrary();
  const libraryEntry = library.find(e => e.mangaId === mangaId);
  const lastReadId = libraryEntry?.lastReadChapter;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[600px] pr-2">
      {chapters.map((chapter) => {
        const isExternal = !!chapter.attributes.externalUrl;
        const isLastRead = lastReadId === chapter.id;

        return isExternal ? (
          <a 
            key={chapter.id} 
            href={chapter.attributes.externalUrl as string}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col justify-between p-3 rounded-xl border transition-all opacity-80 ${isLastRead ? 'border-accent bg-accent/5' : 'border-border bg-dark hover:border-blue-500'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 shrink-0 rounded flex items-center justify-center border transition-colors ${isLastRead ? 'bg-accent/20 border-accent/30' : 'bg-card border-border group-hover:bg-blue-500/10'}`}>
                <BookOpen className={`w-4 h-4 transition-colors ${isLastRead ? 'text-accent' : 'text-gray-500 group-hover:text-blue-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm transition-colors truncate ${isLastRead ? 'text-accent' : 'text-gray-300 group-hover:text-white'}`}>
                  {chapter.attributes.title || `Chapter ${chapter.attributes.chapter}`}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-500 mono bg-card px-1.5 rounded border border-border">
                    Vol {chapter.attributes.volume || "?"}
                  </span>
                  <span className="text-[10px] text-gray-500 mono bg-card px-1.5 rounded border border-border">
                    Ch {chapter.attributes.chapter || "?"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-between items-end border-t border-border pt-2">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                {chapter.attributes.translatedLanguage}
              </span>
              <div className="flex items-center gap-2">
                 {isLastRead && <CheckCircle2 className="w-3 h-3 text-accent" />}
                 <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest group-hover:text-blue-300 transition-colors">
                   External ↗
                 </span>
              </div>
            </div>
          </a>
        ) : (
          <Link 
            key={chapter.id} 
            to={`/reader/${chapter.id}`}
            state={{ mangaId, chapter: chapter.attributes.chapter, title: chapter.attributes.title }}
            className={`group flex flex-col justify-between p-3 rounded-xl border transition-all ${isLastRead ? 'border-accent bg-accent/5' : 'border-border bg-dark hover:border-accent'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 shrink-0 rounded flex items-center justify-center border transition-colors ${isLastRead ? 'bg-accent/20 border-accent/30' : 'bg-card border-border group-hover:bg-accent/10'}`}>
                <BookOpen className={`w-4 h-4 transition-colors ${isLastRead ? 'text-accent' : 'text-gray-500 group-hover:text-accent'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm transition-colors truncate ${isLastRead ? 'text-accent' : 'text-gray-300 group-hover:text-white'}`}>
                  {chapter.attributes.title || `Chapter ${chapter.attributes.chapter}`}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-500 mono bg-card px-1.5 rounded border border-border">
                    Vol {chapter.attributes.volume || "?"}
                  </span>
                  <span className="text-[10px] text-gray-500 mono bg-card px-1.5 rounded border border-border">
                    Ch {chapter.attributes.chapter || "?"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-between items-end border-t border-border pt-2">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                {chapter.attributes.translatedLanguage}
              </span>
              <div className="flex items-center gap-2">
                 {isLastRead && <CheckCircle2 className="w-3 h-3 text-accent" />}
                 <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                   {isLastRead ? 'Continue →' : 'Read →'}
                 </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
