import { useMangaSearch } from "../hooks/useMangaSearch";
import { MangaCard } from "../components/MangaCard";
import { Loader2 } from "lucide-react";

export function Search() {
  const { mangas, loading, error } = useMangaSearch();

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold">Results</h2>
          <span className="text-xs px-2 py-1 bg-dark text-accent border border-border rounded mono">{mangas.length} found</span>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-red-500 font-bold uppercase tracking-widest text-sm text-center">Failed to fetch mangas</p>
            <div className="text-gray-500 mono text-xs text-center">{error}</div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : mangas.length === 0 ? (
          <div className="text-center py-20 text-gray-500 uppercase tracking-widest text-xs font-bold">
            No mangas found. Try another search.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mangas.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
