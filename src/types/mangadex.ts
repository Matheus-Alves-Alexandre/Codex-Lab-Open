// Typing basic MD concepts
export interface MangaAttributes {
  title: Record<string, string>;
  description: Record<string, string>;
  status: string;
  tags: { id: string; attributes: { name: Record<string, string> } }[];
  availableTranslatedLanguages: string[];
  lastChapter?: string | null;
}

export interface Relationship {
  id: string;
  type: string;
  attributes?: any;
}

export interface Manga {
  id: string;
  type: 'manga';
  attributes: MangaAttributes;
  relationships: Relationship[];
}

export interface ChapterAttributes {
  volume: string | null;
  chapter: string | null;
  title: string | null;
  translatedLanguage: string;
  externalUrl: string | null;
}

export interface Chapter {
  id: string;
  type: 'chapter';
  attributes: ChapterAttributes;
  relationships: Relationship[];
}
