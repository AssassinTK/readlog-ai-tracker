
import { Book } from "../types";

/**
 * This service handles synchronization with a Google Sheets via a Google Apps Script Web App.
 * Expects the Web App to handle POST requests with an action parameter.
 */

export const syncBooksToSheets = async (scriptUrl: string, books: Book[]) => {
  if (!scriptUrl) return;

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Standard for simple Apps Script triggers if not configured for CORS
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync',
        data: books
      })
    });
    return true;
  } catch (error) {
    console.error("Failed to sync to Google Sheets:", error);
    throw error;
  }
};

export const fetchBooksFromSheets = async (scriptUrl: string): Promise<Book[] | null> => {
  if (!scriptUrl) return null;

  try {
    const response = await fetch(`${scriptUrl}?action=get`);
    const data = await response.json();
    return data as Book[];
  } catch (error) {
    console.error("Failed to fetch from Google Sheets:", error);
    return null;
  }
};
