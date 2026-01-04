
import { Book } from "../types";

// Access the API base URL from process.env instead of import.meta.env to resolve TypeScript error and maintain consistency.
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://script.google.com/macros/s/AKfycbzPDMJLTqY3o_pTBNsA2TvvkaZkoo-bemq5AkWwnoKJp4hBpWQCHHh1wGjvBlybUjSJ/exec';

/**
 * Service to interact with the Library Database hosted on Google Apps Script.
 * Expects response format: { success: boolean, data: any, error?: string }
 */
export const fetchBooksFromLibraryDB = async (): Promise<Book[]> => {
  const url = `${API_BASE_URL}?action=listBooks`;
  console.log(`[LibraryDB] Attempting to fetch from: ${url}`);
  
  try {
    const response = await fetch(url);
    console.log(`[LibraryDB] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Body: ${text.substring(0, 100)}`);
    }

    const result = await response.json();
    console.log("[LibraryDB] Parsed API Result:", result);

    if (result.success === false) {
      throw new Error(result.error || 'API error fetching books');
    }

    // Return the array from result.data
    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error("[LibraryDB] fetchBooksFromLibraryDB Error:", error);
    throw error;
  }
};

export const createBookInLibraryDB = async (book: Omit<Book, 'id'>): Promise<Book> => {
  const url = `${API_BASE_URL}?action=createBook`;
  console.log(`[LibraryDB] Posting to: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(book),
    });
    
    const result = await response.json();
    if (result.success === false) {
      throw new Error(result.error || 'API error creating book');
    }
    
    return result.data as Book;
  } catch (error) {
    console.error("[LibraryDB] createBookInLibraryDB Error:", error);
    throw error;
  }
};

export const updateBookInLibraryDB = async (bookId: string, updates: Partial<Book>): Promise<Book> => {
  const url = `${API_BASE_URL}?action=updateBook&id=${bookId}`;
  console.log(`[LibraryDB] Posting to: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
    
    const result = await response.json();
    if (result.success === false) {
      throw new Error(result.error || 'API error updating book');
    }
    
    return result.data as Book;
  } catch (error) {
    console.error("[LibraryDB] updateBookInLibraryDB Error:", error);
    throw error;
  }
};

export const deleteBookInLibraryDB = async (bookId: string): Promise<boolean> => {
  const url = `${API_BASE_URL}?action=deleteBook&id=${bookId}`;
  console.log(`[LibraryDB] Posting to: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'POST'
    });
    
    const result = await response.json();
    if (result.success === false) {
      throw new Error(result.error || 'API error deleting book');
    }
    
    // As per requirement: return result.data.deleted === true
    return result.data && result.data.deleted === true;
  } catch (error) {
    console.error("[LibraryDB] deleteBookInLibraryDB Error:", error);
    throw error;
  }
};
