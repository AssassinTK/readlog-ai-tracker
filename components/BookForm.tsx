
import React, { useState, useRef, useEffect } from 'react';
import { Book, ReadingStatus, Note } from '../types';
import { fetchBookInfoFromBooksTW } from '../services/geminiService';

interface BookFormProps {
  books: Book[];
  book?: Book;
  onSave: (book: Book) => void;
  onCancel: () => void;
}

interface GoogleBookResult {
  id: string;
  isLocal?: boolean;
  volumeInfo: {
    title: string;
    authors?: string[];
    categories?: string[];
    imageLinks?: {
      thumbnail: string;
    };
    industryIdentifiers?: { type: string; identifier: string }[];
    publishedDate?: string;
  };
}

const DEFAULT_CATEGORIES = [
  '商業理財',
  '心理勵志',
  '文學小說',
  '人文社科',
  '科幻小說',
  '自我成長',
  '科學',
];

const BookForm: React.FC<BookFormProps> = ({ books, book, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Book>(() => {
    if (book) {
      return {
        ...book,
        notes: book.notes || []
      };
    }
    return {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      author: '',
      category: '商業理財',
      tags: '',
      status: ReadingStatus.READING,
      rating: 4.0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      coverUrl: null,
      notes: [],
      isbn: ''
    };
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const initial = [...DEFAULT_CATEGORIES];
    if (book && book.category && !initial.includes(book.category)) {
      initial.push(book.category);
    }
    return initial;
  });

  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteForQuiz, setNewNoteForQuiz] = useState(false);
  const [searchQuery, setSearchQuery] = useState(book?.title || '');
  const [searchResults, setSearchResults] = useState<GoogleBookResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isManual, setIsManual] = useState(!!book);
  
  // Books.com.tw Fetch state
  const [booksTwUrl, setBooksTwUrl] = useState('');
  const [isFetchingTw, setIsFetchingTw] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<any | null>(null);

  useEffect(() => {
    if (isManual || book) return;

    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const isIsbn = /^[0-9-]{10,17}$/.test(q.replace(/-/g, ''));
        const apiQuery = isIsbn ? `isbn:${q.replace(/-/g, '')}` : q;
        
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(apiQuery)}&maxResults=5`);
        const data = await response.json();
        setSearchResults(data.items || []);
        setShowResults(true);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, book, isManual]);

  const handleSelectBook = (result: GoogleBookResult) => {
    const info = result.volumeInfo;
    const bookCategory = info.categories ? info.categories[0] : formData.category;
    const foundIsbn = info.industryIdentifiers?.find(id => id.type.includes('ISBN'))?.identifier || '';

    if (bookCategory && !categories.includes(bookCategory)) {
      setCategories(prev => [...prev, bookCategory]);
    }

    setFormData(prev => ({
      ...prev,
      title: info.title,
      author: info.authors ? info.authors.join(', ') : '未知作者',
      category: bookCategory,
      isbn: foundIsbn,
      coverUrl: info.imageLinks ? info.imageLinks.thumbnail.replace('http:', 'https:') : prev.coverUrl
    }));
    setSearchQuery(info.title);
    setShowResults(false);
    setIsManual(true);
  };

  const skipSearch = () => {
    setIsManual(true);
    setFormData(prev => ({ ...prev, title: searchQuery }));
    setShowResults(false);
  };

  const handleBooksTwFetch = async () => {
    if (!booksTwUrl.trim()) return;
    setIsFetchingTw(true);
    try {
      const data = await fetchBookInfoFromBooksTW(booksTwUrl);
      if (data) {
        if (data.category && !categories.includes(data.category)) {
          setCategories(prev => [...prev, data.category]);
        }
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          author: data.author || prev.author,
          isbn: data.isbn || prev.isbn,
          category: data.category || prev.category,
          coverUrl: data.coverImageUrl || prev.coverUrl
        }));
        setIsManual(true);
        setSearchQuery(data.title || '');
        setBooksTwUrl('');
      }
    } catch (error) {
      alert("無法從博客來取得資訊，請檢查網址或嘗試手動輸入。");
    } finally {
      setIsFetchingTw(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create a canvas to resize and compress the image
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300; // Small but clear enough for thumbnails
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Convert to JPEG with moderate compression to save space in Library DB
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setFormData(prev => ({ ...prev, coverUrl: dataUrl }));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const note: Note = {
      id: Math.random().toString(36).substr(2, 9),
      text: newNoteText,
      timestamp: new Date().toISOString().split('T')[0],
      isForQuiz: newNoteForQuiz
    };
    setFormData(prev => ({ ...prev, notes: [...(prev.notes || []), note] }));
    setNewNoteText('');
    setNewNoteForQuiz(false);
  };

  const saveBook = () => {
    const finalTitle = isManual ? formData.title : searchQuery;
    if (!finalTitle.trim()) return alert('請輸入書名');
    onSave({ ...formData, title: finalTitle });
  };

  return (
    <div className="flex flex-col h-full bg-background-dark overflow-hidden">
      <div className="fixed -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      
      <div className="sticky top-0 z-40 flex items-center glass-panel p-4 pb-3 justify-between">
        <button onClick={onCancel} className="flex w-12 items-center justify-start text-text-sub hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-text-main text-lg font-bold tracking-wider font-display text-center flex-1">
          {book ? '編輯書本' : '新增書本'}
        </h2>
        <button onClick={saveBook} className="flex w-12 items-center justify-end text-primary hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined" style={{ textShadow: '0 0 10px rgba(0,242,255,0.5)' }}>check</span>
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto pb-24 no-scrollbar relative z-10 px-5 pt-6">
        
        {/* Smart Import Section */}
        {!book && (
          <div className="mb-6 p-4 rounded-2xl bg-surface-card/30 border border-primary/20 shadow-neon-sm">
            <label className="block mb-2 text-[10px] font-bold text-primary tracking-widest uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              博客來智慧導入
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={booksTwUrl}
                onChange={e => setBooksTwUrl(e.target.value)}
                placeholder="貼上博客來網址..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
              />
              <button 
                onClick={handleBooksTwFetch}
                disabled={isFetchingTw || !booksTwUrl.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isFetchingTw ? 'bg-white/5 text-text-sub' : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/40'}`}
              >
                {isFetchingTw ? (
                  <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                ) : '讀取'}
              </button>
            </div>
          </div>
        )}

        <div className="w-full flex justify-center mb-8">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className={`w-36 h-52 bg-surface-card/40 border border-dashed rounded-xl flex flex-col items-center justify-center gap-3 shadow-lg transition-all duration-300 group-hover:border-primary group-hover:shadow-neon-sm overflow-hidden relative ${formData.coverUrl ? 'border-none' : 'border-white/20'}`}>
              {formData.coverUrl ? (
                <img src={formData.coverUrl} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-surface-card border border-white/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">qr_code_scanner</span>
                  </div>
                  <span className="text-[10px] text-text-sub font-medium tracking-widest uppercase">UPLOAD COVER</span>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        <div className="space-y-6">
          {!isManual ? (
            <div className="relative z-30">
              <label className="block mb-2 text-xs font-bold text-primary tracking-widest uppercase ml-1">書名 / ISBN 搜尋</label>
              <div className="relative group">
                <input 
                  className="form-input w-full bg-surface-card/60 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-text-sub/30 focus:outline-none input-glow transition-all duration-300 font-display text-lg tracking-wide" 
                  placeholder="輸入書名或 ISBN..." 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => (searchResults.length > 0 || searchQuery.length > 1) && setShowResults(true)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {isSearching && <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>}
                  <span className="material-symbols-outlined text-primary text-lg">travel_explore</span>
                </div>

                {showResults && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#131316] border border-primary/30 rounded-xl shadow-glass overflow-hidden backdrop-blur-md z-50">
                    <div className="px-3 py-2 border-b border-white/5 bg-primary/5 flex justify-between items-center">
                      <span className="text-[10px] text-primary font-bold tracking-wider uppercase">搜尋結果</span>
                      <button onClick={skipSearch} className="text-[10px] text-text-sub hover:text-primary transition-colors">手動輸入</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto no-scrollbar">
                      {searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <div key={result.id} onClick={() => handleSelectBook(result)} className="flex items-start gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors">
                            <div className="w-10 h-14 bg-surface-card rounded overflow-hidden flex-shrink-0">
                              {result.volumeInfo.imageLinks ? <img src={result.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-800 flex items-center justify-center"><span className="material-symbols-outlined text-xs">book</span></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{result.volumeInfo.title}</p>
                              <p className="text-xs text-text-sub truncate">{result.volumeInfo.authors?.join(', ') || '未知作者'}</p>
                            </div>
                            <span className="material-symbols-outlined text-primary/50">add_circle</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-xs text-text-sub italic">未找到匹配書籍</p>
                          <button onClick={skipSearch} className="mt-2 text-xs text-primary font-bold uppercase tracking-widest border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10">手動輸入資訊</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-[-10px]">
                <span className="text-[10px] text-primary/60 font-bold uppercase tracking-widest">資訊輸入模式</span>
                {!book && <button onClick={() => setIsManual(false)} className="text-[10px] text-text-sub hover:text-white underline">返回搜尋</button>}
              </div>
              <div className="relative z-20">
                <label className="block mb-2 text-xs font-bold text-text-sub tracking-widest uppercase ml-1">書名</label>
                <input 
                  className="form-input w-full bg-surface-card/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all" 
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="relative z-20">
            <label className="block mb-2 text-xs font-bold text-text-sub tracking-widest uppercase ml-1">作者</label>
            <input 
              className="form-input w-full bg-surface-card/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all" 
              type="text"
              value={formData.author}
              onChange={e => setFormData({ ...formData, author: e.target.value })}
            />
          </div>

          <div className="relative z-20">
            <label className="block mb-2 text-xs font-bold text-text-sub tracking-widest uppercase ml-1">ISBN</label>
            <input 
              className="form-input w-full bg-surface-card/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all" 
              type="text"
              placeholder="10 或 13 位數字"
              value={formData.isbn || ''}
              onChange={e => setFormData({ ...formData, isbn: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div>
              <label className="block mb-2 text-xs font-bold text-text-sub tracking-widest uppercase ml-1">分類</label>
              <div className="relative">
                <select 
                  className="form-select w-full appearance-none bg-surface-card/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none">unfold_more</span>
              </div>
            </div>
            <div>
              <label className="block mb-2 text-xs font-bold text-text-sub tracking-widest uppercase ml-1">標籤</label>
              <input className="form-input w-full bg-surface-card/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all" placeholder="#Tag" type="text" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-text-sub tracking-widest uppercase ml-1">閱讀狀態</label>
            <div className="flex bg-surface-card/50 p-1 rounded-xl border border-white/5">
              {Object.values(ReadingStatus).map((status) => (
                <button key={status} onClick={() => setFormData({ ...formData, status })} className={`flex-1 py-2 text-xs transition-all rounded-lg ${formData.status === status ? 'bg-primary/20 text-primary border border-primary/30 font-bold' : 'text-text-sub'}`}>
                  {status}
                </button>
              ))}
            </div>

            {formData.status !== ReadingStatus.NOT_READ && (
              <div className="bg-surface-card/20 rounded-xl p-4 border border-white/5 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-text-sub tracking-widest uppercase">評分</label>
                  <span className="text-primary font-bold text-lg">{formData.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} onClick={() => setFormData({ ...formData, rating: star })} className={`material-symbols-outlined text-3xl cursor-pointer transition-all ${formData.rating >= star ? 'text-primary filled' : 'text-white/10'}`}>star</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-xs font-bold text-text-sub tracking-widest uppercase ml-1">開始</label>
              <input className="form-input w-full bg-surface-card/30 border border-white/10 rounded-xl px-3 py-3 text-white text-sm [color-scheme:dark]" type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
            <div>
              <label className="block mb-2 text-xs font-bold text-text-sub tracking-widest uppercase ml-1">結束</label>
              <input className="form-input w-full bg-surface-card/30 border border-white/10 rounded-xl px-3 py-3 text-white text-sm [color-scheme:dark]" type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
          </div>

          <div className="relative z-10">
            <h3 className="text-white text-lg font-bold leading-tight pb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-secondary rounded-full"></span> 重點與筆記
            </h3>
            {(formData.notes || []).map((note) => (
              <div key={note.id} className="bg-surface-card/40 border border-white/5 rounded-xl p-4 mb-4">
                <div className="flex justify-between gap-4">
                  <p className="text-gray-300 text-sm flex-1">{note.text}</p>
                  <button onClick={() => setFormData(p => ({ ...p, notes: (p.notes || []).filter(n => n.id !== note.id) }))} className="text-text-sub hover:text-red-400"><span className="material-symbols-outlined">delete</span></button>
                </div>
              </div>
            ))}
            <div className="bg-surface-card/20 rounded-xl border border-dashed border-white/20 p-4">
              <textarea className="w-full bg-transparent border-none resize-none focus:ring-0 text-white placeholder:text-text-sub/40 text-sm h-20" placeholder="記錄下啟發..." value={newNoteText} onChange={e => setNewNoteText(e.target.value)} />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded bg-black border-white/20 text-primary" checked={newNoteForQuiz} onChange={e => setNewNoteForQuiz(e.target.checked)} />
                  <span className="text-xs text-text-sub">加入測驗</span>
                </label>
                <button onClick={handleAddNote} className="bg-primary text-black rounded-lg w-8 h-8 flex items-center justify-center shadow-neon hover:scale-105 active:scale-95"><span className="material-symbols-outlined">arrow_upward</span></button>
              </div>
            </div>
          </div>
          <div className="h-8"></div>
        </div>
      </div>
    </div>
  );
};

export default BookForm;
