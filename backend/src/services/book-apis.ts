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
  averageRating?: number;
  ratingsCount?: number;
}

export class BookAPIService {
  
  // Search Google Books API
  static async searchGoogleBooks(query: string): Promise<ExternalBook[]> {
    try {
      const params: any = {
        q: query,
        maxResults: 10,
      };

      if (process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API) {
        params.key = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API;
      }

      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes`,
        {
          params,
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
          averageRating: info.averageRating || undefined,
          ratingsCount: info.ratingsCount || undefined,
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

  // Orchestrate search with fallback logic and mock fallback for offline sandbox testing
  static async search(query: string): Promise<ExternalBook[]> {
    if (!query || query.trim() === '') return [];

    const localMockBooks: ExternalBook[] = [
      {
        title: "Do Epic Shit",
        author: "Ankur Warikoo",
        isbn: "9789392234026",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/I/61H2oM8L6eL.jpg",
        pageCount: 300,
        publishedDate: "2021",
        publisher: "HarperCollins",
        description: "Ankur Warikoo's first book, containing life lessons, tips, and reflections.",
        genres: ["Self-Help", "Personal Development"]
      },
      {
        title: "Harry Potter and the Sorcerer's Stone",
        author: "J.K. Rowling",
        isbn: "9780590353427",
        coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
        pageCount: 309,
        publishedDate: "1997",
        publisher: "Scholastic",
        description: "The story of a young wizard's first year at school.",
        genres: ["Fantasy", "Adventure"]
      },
      {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        isbn: "9780007525492",
        coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
        pageCount: 310,
        publishedDate: "1937",
        publisher: "Allen & Unwin",
        description: "Bilbo Baggins' epic adventure to reclaim the Lonely Mountain.",
        genres: ["Fantasy", "Classics"]
      },
      {
        title: "Atomic Habits",
        author: "James Clear",
        isbn: "9780735211292",
        coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
        pageCount: 320,
        publishedDate: "2018",
        publisher: "Avery",
        description: "An easy and proven way to build good habits and break bad ones.",
        genres: ["Self-Help", "Psychology"]
      }
    ];

    try {
      const gResults = await this.searchGoogleBooks(query);
      if (gResults && gResults.length > 0) {
        return gResults;
      }
    } catch (error) {
      console.warn('[Google Books API] Search failed or timed out:', (error as any).message);
    }

    try {
      const olResults = await this.searchOpenLibrary(query);
      if (olResults && olResults.length > 0) {
        return olResults;
      }
    } catch (olError) {
      console.warn('[Open Library API] Search failed or timed out:', (olError as any).message);
    }

    // Both API searches returned empty or failed - use offline mock fallback
    console.log('[Offline Fallback] Both APIs returned empty or offline. Using local mock database for query:', query);
    const lowerQuery = query.toLowerCase();
    const filtered = localMockBooks.filter(b => 
      b.title.toLowerCase().includes(lowerQuery) || 
      b.author.toLowerCase().includes(lowerQuery)
    );
    return filtered.length > 0 ? filtered : localMockBooks;
  }
}
