
export interface GeneratedConcept {
  html: string;
  css: string;
  js: string;
  explanation: string;
  libraryUrl?: string;
}

export interface EncyclopediaEntry {
  id: string;
  title: string;
  description: string;
  previewImageUrl: string;
  category: string;
  blobUrl: string;
  gotItCount: number;
  creatorUsername: string;
  createdAt: string;
}