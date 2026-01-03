
import React, { useState, useMemo } from 'react';
import { Book, ReadingStatus } from '../types';

interface BookListProps {
  books: Book[];
  onAdd: () => void;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onQuiz: (book: Book) => void;
  onNavigateCategories: () => void;
  onNavigateLibrary3D: () => void;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const BookList: React.FC<BookListProps> = ({ 
  books, 
  onAdd, 
  onEdit, 
  onDelete, 
  onQuiz, 
  onNavigateCategories,
  onNavigateLibrary3D 
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const isOverdue = (book: Book) => {
    if (book.status !== ReadingStatus.READING || !book.startDate) return false;
    const startTime = new Date(book.startDate).getTime();
    return (Date.now() - startTime) > ONE_WEEK_MS;
  };

  const getDaysElapsed = (startDate: string, endDate?: string) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    const startD = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffTime = endD.getTime() - startD.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getElapsedString = (book: Book) => {
    if (!book.startDate) return '';
    const diffDays = getDaysElapsed(book.startDate, book.status === ReadingStatus.READ ? book.endDate : undefined);
    
    const start = new Date(book.startDate);
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const dd = String(start.getDate()).padStart(2, '0');

    if (book.status === ReadingStatus.READ) {
      return `${yyyy}/${mm}/${dd} | ${diffDays} days`;
    }

    return `${yyyy}/${mm}/${dd} | ${diffDays} days ago`;
  };

  const overdueCount = useMemo(() => {
    return books.filter(isOverdue).length;
  }, [books]);

  const sortedAndFilteredBooks = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    let filtered = books;
    
    if (q) {
      filtered = books.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q) ||
        (b.tags && b.tags.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      if (a.status === ReadingStatus.READING && b.status !== ReadingStatus.READING) return -1;
      if (a.status !== ReadingStatus.READING && b.status === ReadingStatus.READING) return 1;
      
      return 0;
    });
  }, [books, filterQuery]);

  return (
    <div className="flex flex-col h-full bg-background-dark relative overflow-hidden">
      <div className="fixed -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      
      <header className="sticky top-0 z-40 glass-panel p-6 pb-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-display text-white tracking-wider uppercase">我的書架</h1>
            <p className="text-text-sub text-[10px] uppercase tracking-widest mt-1">LIBRARIUM // {books.length} BOOKS</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onNavigateLibrary3D}
              className="bg-primary/10 border border-primary/30 text-primary p-2.5 rounded-full hover:bg-primary/20 transition-all shadow-neon-sm"
              title="3D 圖書館"
            >
              <span className="material-symbols-outlined font-bold">view_in_ar</span>
            </button>
            <button 
              onClick={onNavigateCategories}
              className="bg-surface-card border border-white/10 text-text-sub p-2.5 rounded-full hover:bg-surface-card/80 transition-all"
              title="分類瀏覽"
            >
              <span className="material-symbols-outlined font-bold">category</span>
            </button>
            <button 
              onClick={onAdd}
              className="bg-primary text-black p-2.5 rounded-full shadow-neon hover:scale-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined font-bold">add</span>
            </button>
          </div>
        </div>

        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sub text-sm group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text"
            placeholder="搜尋書名、作者或標籤..."
            className="w-full bg-surface-card/30 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-sub/40"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </div>

        {overdueCount > 0 && !filterQuery && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
            <div className="bg-secondary/20 p-1.5 rounded-full">
              <span className="material-symbols-outlined text-secondary text-sm filled">notifications_active</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-white font-bold uppercase tracking-wider">閱讀進度提醒</p>
              <p className="text-[11px] text-text-sub">你有 {overdueCount} 本書已讀超過一週，建議回顧筆記！</p>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar relative z-10 [perspective:1000px]">
        {sortedAndFilteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-surface-card border border-white/10 rounded-full flex items-center justify-center text-primary shadow-neon-sm">
              <span className="material-symbols-outlined text-5xl">{filterQuery ? 'search_off' : 'auto_stories'}</span>
            </div>
            <p className="text-text-sub font-light tracking-wide italic">
              {filterQuery ? `找不到與「${filterQuery}」相關的書` : '書架空空如也... \n 點擊上方開始你的閱讀旅程'}
            </p>
          </div>
        ) : (
          sortedAndFilteredBooks.map(book => {
            const overdue = isOverdue(book);
            return (
              <div 
                key={book.id} 
                className={`group bg-surface-card/40 hover:bg-surface-card/60 rounded-2xl shadow-lg border overflow-hidden flex transition-all duration-500 animate-fade-in backdrop-blur-sm transform-gpu hover:-translate-y-1.5 hover:shadow-2xl ${overdue ? 'border-secondary/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'border-white/5 hover:border-primary/30'}`}
              >
                <div className="w-24 shrink-0 bg-background-dark/50 relative overflow-hidden">
                  {book.coverUrl ? (
                    <img 
                      src={book.coverUrl} 
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-125 group-hover:rotate-3" 
                      alt={book.title} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10 group-hover:text-primary/30 transition-colors">
                      <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform">book</span>
                    </div>
                  )}
                  {overdue && (
                    <div className="absolute top-0 left-0 bg-secondary text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-br-lg shadow-neon-sm tracking-tighter z-10">
                      LONG TERM
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                </div>
                
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-white text-sm line-clamp-2 tracking-wide font-display group-hover:text-primary transition-colors leading-snug">{book.title}</h3>
                      <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border tracking-widest transition-all ${
                        book.status === ReadingStatus.READING 
                          ? 'bg-primary/10 text-primary border-primary/30 shadow-neon-sm' 
                          : book.status === ReadingStatus.READ
                          ? 'bg-secondary/10 text-secondary border-secondary/30'
                          : 'bg-white/5 text-text-sub border-white/10'
                      }`}>
                        {book.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-sub mt-1 uppercase tracking-wider">{book.author}</p>
                    {book.startDate && (
                      <p className={`text-[9px] mt-1 font-medium tracking-tight transition-colors ${book.status === ReadingStatus.READ ? 'text-secondary/70' : 'text-primary/70'}`}>
                        {getElapsedString(book)}
                      </p>
                    )}
                    {book.status !== ReadingStatus.NOT_READ && (
                      <div className="flex items-center mt-2 text-primary">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span key={i} className={`material-symbols-outlined text-xs transition-all duration-300 ${book.rating >= i ? 'filled' : 'opacity-10 group-hover:opacity-20'}`}>star</span>
                        ))}
                        <span className="text-[10px] font-bold ml-2 font-display">{book.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2.5 mt-3 pt-3 border-t border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {book.notes?.some(n => n.isForQuiz) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onQuiz(book); }}
                        className="w-9 h-9 flex items-center justify-center bg-secondary/10 text-secondary rounded-xl border border-secondary/20 hover:bg-secondary hover:text-white transition-all shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-90"
                        title="開始測驗"
                      >
                        <span className="material-symbols-outlined text-lg">psychology</span>
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(book); }}
                      className="w-9 h-9 flex items-center justify-center bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-black transition-all hover:shadow-neon active:scale-90"
                      title="編輯資訊"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
                      className="w-9 h-9 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-90"
                      title="刪除節點"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BookList;
