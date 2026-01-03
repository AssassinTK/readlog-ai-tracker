
import React, { useState, useMemo } from 'react';
import { Book, ReadingStatus, AppSettings } from '../types';

interface CategoryViewProps {
  books: Book[];
  onBack: () => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  onQuizBook: (book: Book) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onFetchFromSheets: () => void;
  isSyncing: boolean;
}

const CategoryView: React.FC<CategoryViewProps> = ({ 
  books, onBack, onEditBook, onDeleteBook, onQuizBook, settings, onUpdateSettings, onFetchFromSheets, isSyncing
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncUrl, setSyncUrl] = useState(settings.googleSheetsUrl);

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    books.forEach(book => {
      const cat = book.category || '未分類';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [books]);

  const filteredBooks = useMemo(() => {
    if (!selectedCategory) return [];
    return books.filter(b => (b.category || '未分類') === selectedCategory);
  }, [books, selectedCategory]);

  const handleSaveSync = () => {
    onUpdateSettings({ googleSheetsUrl: syncUrl });
    setShowSyncSettings(false);
  };

  return (
    <div className="flex flex-col h-full bg-background-dark relative overflow-hidden">
      <div className="fixed -bottom-20 -left-20 w-80 h-80 bg-secondary/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <header className="sticky top-0 z-40 glass-panel p-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-text-sub hover:text-white transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold font-display text-white tracking-wider uppercase">分類瀏覽</h1>
            <p className="text-text-sub text-[10px] uppercase tracking-widest mt-0.5">Explore your collection</p>
          </div>
        </div>
        <button 
          onClick={() => setShowSyncSettings(!showSyncSettings)} 
          className={`p-2 rounded-full transition-all ${showSyncSettings ? 'bg-primary text-black' : 'bg-surface-card border border-white/10 text-text-sub'}`}
        >
          <span className="material-symbols-outlined text-sm">{isSyncing ? 'sync' : 'cloud_sync'}</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5 no-scrollbar relative z-10">
        
        {showSyncSettings && (
          <div className="mb-8 p-4 bg-surface-card/60 border border-primary/30 rounded-2xl animate-fade-in shadow-neon-sm">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">settings</span>
              Google Sheets 同步設定
            </h3>
            <p className="text-[10px] text-text-sub mb-3 leading-relaxed">
              輸入 Google Apps Script Web App 網址以同步您的閱讀數據。
            </p>
            <div className="space-y-3">
              <input 
                type="text" 
                value={syncUrl}
                onChange={e => setSyncUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveSync}
                  className="flex-1 bg-primary/10 text-primary border border-primary/30 py-2 rounded-xl text-xs font-bold hover:bg-primary/20 transition-all"
                >
                  儲存網址
                </button>
                <button 
                  onClick={onFetchFromSheets}
                  disabled={isSyncing || !settings.googleSheetsUrl}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${isSyncing || !settings.googleSheetsUrl ? 'bg-white/5 border-white/5 text-text-sub opacity-50' : 'bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20'}`}
                >
                  {isSyncing ? <span className="w-3 h-3 border-2 border-secondary border-t-transparent rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-sm">cloud_download</span>}
                  從雲端讀取
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-8">
          {categoryStats.length === 0 ? (
            <div className="col-span-2 py-10 text-center text-text-sub italic">目前書架尚無書籍</div>
          ) : (
            categoryStats.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-start text-left group ${
                  selectedCategory === cat 
                    ? 'bg-primary/20 border-primary shadow-neon-sm' 
                    : 'bg-surface-card/40 border-white/5 hover:border-white/20'
                }`}
              >
                <span className={`text-xs font-bold mb-1 ${selectedCategory === cat ? 'text-primary' : 'text-text-sub group-hover:text-white'}`}>{cat}</span>
                <span className="text-[10px] text-text-sub/60 uppercase tracking-widest">{count} {count === 1 ? 'Book' : 'Books'}</span>
                {selectedCategory === cat && <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-neon"></div>}
              </button>
            ))
          )}
        </div>

        {selectedCategory && (
          <div className="space-y-4 animate-fade-in pb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 bg-primary shadow-neon rounded-full"></span>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">{selectedCategory} 內容</h2>
            </div>
            
            {filteredBooks.map(book => (
              <div key={book.id} className="group bg-surface-card/40 hover:bg-surface-card/60 rounded-2xl shadow-lg border border-white/5 overflow-hidden flex transition-all duration-300 hover:border-primary/30 backdrop-blur-sm">
                <div className="w-16 shrink-0 bg-background-dark/50 relative">
                  {book.coverUrl ? <img src={book.coverUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-white/10"><span className="material-symbols-outlined text-2xl">book</span></div>}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs line-clamp-1">{book.title}</h3>
                    <p className="text-[9px] text-text-sub uppercase tracking-wider">{book.author}</p>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    {book.notes?.some(n => n.isForQuiz) && <button onClick={() => onQuizBook(book)} className="text-secondary"><span className="material-symbols-outlined text-lg">psychology</span></button>}
                    <button onClick={() => onEditBook(book)} className="text-primary"><span className="material-symbols-outlined text-lg">edit</span></button>
                    <button onClick={() => onDeleteBook(book.id)} className="text-red-400"><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryView;
