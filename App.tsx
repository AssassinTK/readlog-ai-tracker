
import React, { useState, useEffect } from 'react';
import { Book, ReadingStatus, AppSettings } from './types';
import BookForm from './components/BookForm';
import BookList from './components/BookList';
import QuizView from './components/QuizView';
import CategoryView from './components/CategoryView';
import Library3DView from './components/Library3DView';
import * as libraryDB from './services/libraryDBService';

const SETTINGS_KEY = 'readlog_settings';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'quiz' | 'categories' | 'library3d'>('list');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [activeQuizBook, setActiveQuizBook] = useState<Book | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ googleSheetsUrl: '' });
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Modal State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Load initial data from API and local settings
  useEffect(() => {
    const loadData = async () => {
      console.log("%c[App] Starting to fetch books from Library DB...", "color: #00f2ff; font-weight: bold;");
      setIsLoading(true);
      setError(null);
      try {
        const cloudBooks = await libraryDB.fetchBooksFromLibraryDB();
        console.log("[App] Response from fetchBooksFromLibraryDB():", cloudBooks);
        
        if (Array.isArray(cloudBooks)) {
          console.log(`%c[App] SUCCESS: ${cloudBooks.length} books loaded.`, "color: #4ade80; font-weight: bold;");
          setBooks(cloudBooks);
        } else {
          console.warn("[App] API returned non-array data:", cloudBooks);
          setBooks([]);
        }
      } catch (e) {
        console.error("%c[App] Error fetching books from Library DB - Full Details:", "color: #ef4444; font-weight: bold;", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        setError(`資料庫讀取失敗: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }

    loadData();
  }, []);

  const handleSaveBook = async (book: Book) => {
    setIsLoading(true);
    setError(null);
    try {
      if (editingBook) {
        // Update existing book
        const updated = await libraryDB.updateBookInLibraryDB(book.id, book);
        setBooks(prev => prev.map(b => b.id === updated.id ? updated : b));
      } else {
        // Create new book (API generates ID)
        const created = await libraryDB.createBookInLibraryDB(book);
        setBooks(prev => [...prev, created]);
      }
      setView('list');
      setEditingBook(null);
    } catch (e) {
      console.error("Save failed:", e);
      setError("儲存失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setView('edit');
  };

  const requestDeleteBook = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDeleteBook = async () => {
    if (!confirmDeleteId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await libraryDB.deleteBookInLibraryDB(confirmDeleteId);
      setBooks(prev => prev.filter(b => b.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (e) {
      console.error("Delete failed:", e);
      setError("刪除失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = (book: Book) => {
    setActiveQuizBook(book);
    setView('quiz');
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  };

  const deletingBook = books.find(b => b.id === confirmDeleteId);

  return (
    <div className="flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-dark shadow-2xl relative">
      
      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-neon"></div>
            <p className="text-[10px] text-primary font-bold tracking-[0.3em] uppercase animate-pulse">Synchronizing Node...</p>
          </div>
        </div>
      )}

      {/* ERROR TOAST / MODAL */}
      {error && (
        <div className="fixed inset-x-0 top-0 z-[3000] p-4 flex justify-center pointer-events-none">
          <div className="w-full max-w-sm bg-red-500/10 backdrop-blur-xl border border-red-500/50 p-4 rounded-2xl shadow-2xl flex items-start gap-4 animate-fade-in pointer-events-auto">
            <div className="bg-red-500/20 p-2 rounded-xl">
              <span className="material-symbols-outlined text-red-500">error</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-1">System Exception</h4>
              <p className="text-[11px] text-white leading-relaxed font-mono break-words">{error}</p>
              <div className="mt-3 flex gap-3">
                <button 
                  onClick={() => window.location.reload()} 
                  className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-white underline transition-colors"
                >
                  重試連線
                </button>
                <button 
                  onClick={() => {
                    const url = 'https://script.google.com/macros/s/AKfycbzpyvV8oBt2ed9iwnR3lMiPZQIHVsgDimCpb9pO5033XiAD99mhI_TFj1XuCjEfGJ-N/exec?action=listBooks';
                    window.open(url, '_blank');
                  }} 
                  className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-white underline transition-colors"
                >
                  直接測試端點
                </button>
              </div>
            </div>
            <button onClick={() => setError(null)} className="text-red-500/50 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {view === 'list' && (
        <BookList 
          books={books} 
          onAdd={() => setView('add')} 
          onEdit={handleEditBook}
          onDelete={requestDeleteBook}
          onQuiz={handleStartQuiz}
          onNavigateCategories={() => setView('categories')}
          onNavigateLibrary3D={() => setView('library3d')}
        />
      )}
      
      {(view === 'add' || view === 'edit') && (
        <BookForm 
          books={books}
          book={editingBook || undefined}
          onSave={handleSaveBook}
          onCancel={() => {
            setView('list');
            setEditingBook(null);
          }}
        />
      )}

      {view === 'quiz' && activeQuizBook && (
        <QuizView 
          book={activeQuizBook}
          onClose={() => {
            setView('list');
            setActiveQuizBook(null);
          }}
        />
      )}

      {view === 'categories' && (
        <CategoryView 
          books={books}
          onBack={() => setView('list')}
          onEditBook={handleEditBook}
          onDeleteBook={requestDeleteBook}
          onQuizBook={handleStartQuiz}
          settings={settings}
          onUpdateSettings={updateSettings}
          onFetchFromSheets={() => {}} 
          isSyncing={isLoading}
        />
      )}

      {view === 'library3d' && (
        <Library3DView 
          books={books}
          onBack={() => setView('list')}
          onSelectBook={handleEditBook}
        />
      )}

      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 bg-primary/20 backdrop-blur-md border border-primary/50 text-primary font-bold rounded-2xl shadow-neon flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined filled text-sm">check_circle</span>
          <span className="text-xs tracking-widest uppercase">刪除成功！節點已移除</span>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs bg-surface-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <span className="material-symbols-outlined text-red-500 text-3xl">delete_forever</span>
              </div>
              <h3 className="text-lg font-bold text-white font-display mb-2 uppercase tracking-tight">確認刪除節點？</h3>
              <p className="text-xs text-text-sub leading-relaxed">
                確定要從圖書館中永久移除「<span className="text-red-400 font-bold">{deletingBook?.title}</span>」嗎？此操作無法撤回。
              </p>
            </div>
            <div className="flex border-t border-white/5">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-4 text-xs font-bold text-text-sub hover:bg-white/5 transition-colors border-r border-white/5 uppercase tracking-widest"
              >
                取消
              </button>
              <button 
                onClick={confirmDeleteBook}
                className="flex-1 py-4 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-widest"
              >
                確認移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
