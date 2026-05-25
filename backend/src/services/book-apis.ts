import axios from 'axios';

export interface ExternalBook {
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
  description?: string;
  genres: string[];
}

export class BookAPIService {
  
  // Search Google Books API
  static async searchGoogleBooks(query: string): Promise<ExternalBook[]> {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes`,
        {
          params: {
            q: query,
            maxResults: 10,
          },
          timeout: 8000
        }
      );
      
      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      return response.data.items.map((item: any) => {
        const info = item.volumeInfo || {};
        const identifiers = info.industryIdentifiers || [];
        const isbn13 = identifiers.find((id: any) => id.type === 'ISBN_13')?.identifier 
                    || identifiers.find((id: any) => id.type === 'ISBN_10')?.identifier;

        return {
          title: info.title || 'Unknown Title',
          author: info.authors ? info.authors.join(', ') : 'Unknown Author',
          isbn: isbn13 || undefined,
          coverUrl: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || undefined,
          pageCount: info.pageCount || undefined,
          publishedDate: info.publishedDate || undefined,
          publisher: info.publisher || undefined,
          description: info.description || undefined,
          genres: info.categories || [],
        };
      });
    } catch (e: any) {
      console.warn('Google Books search failed, falling back...', e.message);
      throw e; // Bubble up to trigger fallback
    }
  }

  // Fallback: Search Open Library API
  static async searchOpenLibrary(query: string): Promise<ExternalBook[]> {
    try {
      const response = await axios.get(
        `https://openlibrary.org/search.json`,
        {
          params: {
            q: query,
            limit: 10,
          },
          timeout: 8000
        }
      );
      
      if (!response.data.docs || response.data.docs.length === 0) {
        return [];
      }

      return response.data.docs.map((doc: any) => {
        return {
          title: doc.title || 'Unknown Title',
          author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
          isbn: doc.isbn ? doc.isbn[0] : undefined,
          coverUrl: doc.cover_i 
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined,
          pageCount: doc.number_of_pages_median || undefined,
          publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
          publisher: doc.publisher ? doc.publisher[0] : undefined,
          description: doc.first_sentence ? doc.first_sentence[0] : undefined,
          genres: doc.subject ? doc.subject.slice(0, 5) : [],
        };
      });
    } catch (e: any) {
      console.error('Open Library fallback search failed:', e.message);
      return [];
    }
  }

  // Orchestrate search with fallback logic
  static async search(query: string): Promise<ExternalBook[]> {
    if (!query || query.trim() === '') return [];
    try {
      return await this.searchGoogleBooks(query);
    } catch (error) {
      return await this.searchOpenLibrary(query);
    }
  }
}
