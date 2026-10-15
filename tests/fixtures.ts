import type { Manga, Chapter } from '../src/types/mangadex';
export const manga: Manga = {
  id: 'manga-1', type: 'manga',
  attributes: { title: { en: 'Roots Manga' }, description: { en: 'Uma aventura de teste.' }, status: 'ongoing', tags: [], availableTranslatedLanguages: ['en', 'pt-br'], lastChapter: '3' },
  relationships: [
    { id: 'cover-1', type: 'cover_art', attributes: { fileName: 'cover.jpg' } },
    { id: 'author-1', type: 'author', attributes: { name: 'Autor de Teste' } },
  ],
};
export const chapters: Chapter[] = [1, 2, 3].map(n => ({
  id: `chapter-${n}`, type: 'chapter',
  attributes: { volume: '1', chapter: String(n), title: `Capítulo ${n}`, translatedLanguage: 'pt-br', externalUrl: null },
  relationships: [{ id: manga.id, type: 'manga' }],
}));
