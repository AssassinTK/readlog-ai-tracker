
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Book } from '../types';

interface Library3DViewProps {
  books: Book[];
  onBack: () => void;
  onSelectBook: (book: Book) => void;
}

const SHELF_CAPACITY = 12;

const Library3DView: React.FC<Library3DViewProps> = ({ books, onBack, onSelectBook }) => {
  const [hasEntered, setHasEntered] = useState(false);
  const [activeLayer, setActiveLayer] = useState(0);
  const [isWarping, setIsWarping] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false); // Default to closed for maximum visibility
  const [isHoveringEdge, setIsHoveringEdge] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const booksByCategory = useMemo(() => {
    const groups: Record<string, Book[]> = {};
    const defaultCats = ['商業理財', '心理勵志', '文學小說', '人文社科', '科幻小說', '自我成長'];
    defaultCats.forEach(c => groups[c] = []);

    books.forEach(book => {
      const cat = book.category || '未分類';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(book);
    });

    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [books]);

  // Global mouse proximity listener to avoid click-blocking trigger zones
  useEffect(() => {
    if (!hasEntered) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      // If nav is open, we don't need the proximity hover state
      if (isNavOpen) return;
      
      // If mouse is within 40px of left edge, show handle
      if (e.clientX < 40) {
        setIsHoveringEdge(true);
      } 
      // If mouse moves away (beyond 120px), hide handle
      else if (e.clientX > 120) {
        setIsHoveringEdge(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [hasEntered, isNavOpen]);

  // Particle System Effect
  useEffect(() => {
    if (!hasEntered || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; z: number; size: number; speed: number }[] = [];
    const particleCount = 150;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: (Math.random() - 0.5) * canvas.width * 2,
          y: (Math.random() - 0.5) * canvas.height * 2,
          z: Math.random() * 2000,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 2 + 1
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.forEach(p => {
        p.z -= p.speed * (isWarping ? 12 : 1);
        if (p.z <= 0) p.z = 2000;

        const k = 1000 / p.z;
        const px = p.x * k + centerX;
        const py = p.y * k + centerY;

        if (px > 0 && px < canvas.width && py > 0 && py < canvas.height) {
          const size = p.size * k;
          const alpha = (2000 - p.z) / 2000;
          ctx.fillStyle = `rgba(0, 242, 255, ${alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();

          if (isWarping) {
            ctx.strokeStyle = `rgba(0, 242, 255, ${alpha * 0.15})`;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(centerX, centerY);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    createParticles();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasEntered, isWarping]);

  const goToLayer = (index: number) => {
    if (index === activeLayer || isWarping) return;
    triggerWarp();
    setActiveLayer(index);
    if (window.innerWidth < 768) {
      setIsNavOpen(false); // Auto-close on mobile selection
    }
  };

  const handleNext = () => {
    if (activeLayer < booksByCategory.length - 1) {
      goToLayer(activeLayer + 1);
    }
  };

  const handlePrev = () => {
    if (activeLayer > 0) {
      goToLayer(activeLayer - 1);
    }
  };

  const triggerWarp = () => {
    setIsWarping(true);
    setTimeout(() => setIsWarping(false), 900);
  };

  const getCoverColor = (title: string) => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background-dark text-text-main flex flex-col overflow-hidden font-display selection:bg-primary selection:text-black">
      
      {/* BACKGROUND CANVAS FOR PARTICLES */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 pointer-events-none z-[110] transition-opacity duration-1000 ${hasEntered ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* GLOBAL HUD OVERLAYS */}
      <div className="absolute inset-0 pointer-events-none z-[120]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[size:100%_4px,3px_100%] opacity-40"></div>
        <div className="absolute inset-0 shadow-[inner_0_0_200px_rgba(0,0,0,0.9)]"></div>
      </div>

      {/* ENTRANCE PORTAL */}
      {!hasEntered && (
        <div className="absolute inset-0 z-[150] bg-black flex flex-col items-center justify-center p-6">
          <div className="absolute bottom-0 w-full h-1/2 bg-[linear-gradient(to_right,rgba(0,242,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,242,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [transform:rotateX(60deg)] opacity-10"></div>
          
          <div className="relative group cursor-pointer" onClick={() => setHasEntered(true)}>
            <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-primary/20 flex items-center justify-center relative transition-all duration-700 group-hover:scale-110 group-hover:border-primary group-hover:shadow-neon">
              <div className="absolute inset-0 border-2 border-primary/5 rounded-full animate-[spin_20s_linear_infinite]"></div>
              <div className="absolute inset-4 border border-secondary/10 rounded-full animate-[spin_12s_linear_infinite_reverse]"></div>
              
              <div className="text-center z-10 px-4">
                <span className="material-symbols-outlined text-4xl sm:text-6xl text-primary drop-shadow-neon mb-2">face_retouching_natural</span>
                <p className="text-[8px] sm:text-[10px] font-black tracking-[0.4em] sm:tracking-[0.6em] text-primary uppercase">Sync Neural</p>
                <p className="text-[7px] sm:text-[8px] text-text-sub uppercase tracking-widest mt-1">Establishing Uplink</p>
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 bg-primary/5 rounded-full blur-[60px] sm:blur-[80px] animate-pulse"></div>
          </div>
          
          <div className="mt-12 sm:mt-16 flex flex-col items-center gap-4">
            <div className="w-px h-10 sm:h-12 bg-gradient-to-b from-primary/60 to-transparent"></div>
            <p className="text-[8px] sm:text-[9px] text-primary/40 uppercase tracking-[0.5em] animate-pulse font-black">Auth Required</p>
          </div>
        </div>
      )}

      {/* MAIN ARCHIVE HUD */}
      <header className={`z-[200] p-4 sm:p-6 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-primary/10 transition-all duration-1000 ${hasEntered ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="flex items-center gap-3 sm:gap-5">
          <button 
            onClick={onBack} 
            title="返回主選單"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all group"
          >
            <span className="material-symbols-outlined text-xl group-hover:animate-pulse">arrow_back</span>
          </button>
          <div className="relative">
            <h1 className="text-sm sm:text-lg font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white animate-glitch" data-text="LIBRARIUM_OS">LIBRARIUM_OS</h1>
            <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary animate-ping"></span>
              <p className="text-[7px] sm:text-[8px] text-primary/60 uppercase tracking-[0.1em] sm:tracking-[0.2em] whitespace-nowrap">CORE_LINK // {books.length} NODES</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="text-right border-r border-primary/20 pr-4 sm:pr-6 hidden xs:block">
            <p className="text-[7px] sm:text-[8px] text-text-sub uppercase tracking-widest">SECTOR</p>
            <p className="text-xs sm:text-sm font-black text-primary tracking-tighter truncate max-w-[80px] sm:max-w-none">
              0x{activeLayer.toString(16).toUpperCase().padStart(2, '0')} // {booksByCategory[activeLayer]?.[0]}
            </p>
          </div>
          <div className="flex flex-col items-end">
             <p className="text-[7px] sm:text-[8px] text-text-sub uppercase tracking-widest">NEURAL</p>
             <div className="w-16 sm:w-32 h-1 bg-white/5 mt-1 relative overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-neon transition-all duration-[800ms] ease-in-out" 
                  style={{ width: `${((activeLayer + 1) / booksByCategory.length) * 100}%` }}
                ></div>
             </div>
          </div>
        </div>
      </header>

      {/* SIDE SECTOR NAVIGATION */}
      <div 
        className={`absolute left-0 top-0 h-full z-[250] pointer-events-none flex items-center transition-all duration-700 ease-in-out ${hasEntered ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Semi-transparent backdrop for mobile nav */}
        {isNavOpen && (
          <div 
            onClick={() => setIsNavOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-10 pointer-events-auto md:hidden"
          ></div>
        )}

        {/* Toggle Button */}
        <div className={`absolute left-0 transition-all duration-500 overflow-hidden ${(!isNavOpen && !isHoveringEdge) ? 'w-0 opacity-0' : 'w-9 sm:w-10 opacity-100'} z-30 pointer-events-auto`}>
          <button 
            onClick={() => setIsNavOpen(!isNavOpen)}
            className={`flex flex-col items-center justify-center gap-1.5 w-9 sm:w-10 h-32 sm:h-36 bg-black/90 backdrop-blur-md border border-l-0 border-primary/30 rounded-r-xl transition-all hover:bg-primary/20 group shadow-neon-sm active:scale-95`}
          >
            <span className={`material-symbols-outlined text-primary text-lg sm:text-xl transition-transform duration-500 ${isNavOpen ? 'rotate-180' : 'animate-pulse'}`}>
              double_arrow
            </span>
            <span className="text-[7px] sm:text-[8px] text-primary/80 font-black uppercase tracking-[0.2em] [writing-mode:vertical-rl] mt-2 group-hover:text-primary transition-colors">
              {isNavOpen ? 'CLOSE' : 'SECTORS'}
            </span>
          </button>
        </div>

        {/* Sidebar Panel */}
        <aside 
          className={`h-fit max-h-[60vh] sm:max-h-[70vh] w-48 sm:w-52 bg-black/90 backdrop-blur-2xl border-y border-r border-primary/20 rounded-r-2xl py-4 sm:py-6 px-3 sm:px-4 flex flex-col gap-3 sm:gap-4 shadow-[0_0_60px_rgba(0,0,0,0.9)] transition-all duration-500 origin-left pointer-events-auto z-20 ${isNavOpen ? 'translate-x-9 sm:translate-x-10 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}
        >
          <div className="text-[7px] sm:text-[8px] text-primary font-black uppercase tracking-[0.4em] mb-1 sm:mb-2 px-2 border-l-2 border-primary">Archived_Sectors</div>
          <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar pr-1">
            {booksByCategory.map(([cat, catBooks], idx) => (
              <button
                key={`nav-${cat}`}
                onClick={() => goToLayer(idx)}
                className={`group flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 rounded-lg transition-all duration-300 relative overflow-hidden ${activeLayer === idx ? 'bg-primary/10 border border-primary/30' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <span className={`text-[9px] sm:text-[10px] font-black tracking-tighter ${activeLayer === idx ? 'text-primary' : 'text-text-sub/50 group-hover:text-text-sub'}`}>
                  0{idx + 1}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all truncate ${activeLayer === idx ? 'text-white' : 'text-text-sub/30 group-hover:text-text-sub'}`}>
                  {cat}
                </span>
                {activeLayer === idx && (
                  <div className="absolute right-2 w-1 h-1 rounded-full bg-primary shadow-neon animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-white/5 text-[6px] sm:text-[7px] text-text-sub font-black uppercase tracking-[0.2em] text-center opacity-40">
            System Index Rev 4.2
          </div>
        </aside>
      </div>

      {/* 3D CORE VIEW */}
      <main className={`flex-1 relative flex items-center justify-center transition-all duration-700 [perspective:2000px] overflow-hidden ${hasEntered ? 'opacity-100' : 'opacity-0 scale-150'} ${isNavOpen ? 'md:pl-48' : 'pl-0'}`}>
        
        {/* Infinite Grid Tunnel */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isWarping ? 'scale-150 blur-lg opacity-50' : 'scale-100 opacity-20'}`}>
          <div className="absolute top-0 w-full h-[50%] bg-[linear-gradient(to_right,rgba(0,242,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,242,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:80px_80px] [transform:rotateX(-85deg)] origin-top"></div>
          <div className="absolute bottom-0 w-full h-[50%] bg-[linear-gradient(to_right,rgba(0,242,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,242,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:80px_80px] [transform:rotateX(85deg)] origin-bottom"></div>
        </div>

        {/* Warp Pulse Effect */}
        <div className={`absolute w-[150vw] h-[150vh] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] transition-all duration-1000 pointer-events-none ${isWarping ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}></div>

        {/* Layer Progression Container */}
        <div className="w-full max-w-5xl h-[500px] sm:h-[600px] relative [transform-style:preserve-3d]">
          {booksByCategory.map(([cat, catBooks], idx) => {
            const zOffset = (idx - activeLayer) * 1200;
            const opacity = idx === activeLayer ? 1 : idx < activeLayer ? 0 : 0.05 / (idx - activeLayer);
            const scale = idx === activeLayer ? 1 : 0.4;
            const blur = idx === activeLayer ? 0 : 12;
            
            return (
              <div
                key={cat}
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[1200ms] ease-out [transform-style:preserve-3d] ${isWarping && idx === activeLayer ? 'blur-md' : ''}`}
                style={{
                  transform: `translateZ(${zOffset}px) scale(${scale})`,
                  opacity,
                  filter: `blur(${blur}px)`,
                  pointerEvents: idx === activeLayer ? 'auto' : 'none'
                }}
              >
                {/* Holographic Header */}
                <div 
                  className={`mb-6 sm:mb-12 text-center relative group/header transition-all duration-500 ${idx !== activeLayer ? 'cursor-pointer hover:scale-110' : ''}`}
                  onClick={() => idx !== activeLayer && goToLayer(idx)}
                >
                  <div className="absolute -top-8 sm:-top-12 left-1/2 -translate-x-1/2 w-px h-8 sm:h-12 bg-gradient-to-b from-primary to-transparent opacity-60"></div>
                  <h2 className={`text-2xl sm:text-5xl font-black tracking-[0.2em] sm:tracking-[0.4em] uppercase select-none relative transition-all duration-500 ${idx === activeLayer ? 'text-white drop-shadow-neon' : 'text-white/20'}`}>
                    {cat}
                  </h2>
                  <div className={`mt-3 sm:mt-6 flex items-center justify-center gap-2 sm:gap-4 transition-all duration-500 ${idx === activeLayer ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[8px] sm:text-[10px] text-primary/40 font-bold uppercase tracking-widest flex items-center gap-1 sm:gap-2">
                       <span className="material-symbols-outlined text-[10px]">location_on</span>
                       SECTOR_0{idx + 1}
                    </span>
                    <span className="w-8 sm:w-12 h-px bg-primary/10"></span>
                    <span className="text-[8px] sm:text-[10px] text-primary font-black uppercase tracking-widest">{catBooks.length} NODES</span>
                  </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-8 p-4 sm:p-12 bg-black/40 border border-primary/10 rounded-[1.5rem] sm:rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden shadow-2xl group/layer max-w-[95vw] sm:max-w-none max-h-[60vh] overflow-y-auto no-scrollbar">
                  <div className="absolute top-3 left-3 border-l border-t border-primary/20 w-3 h-3"></div>
                  <div className="absolute bottom-3 right-3 border-r border-b border-primary/20 w-3 h-3"></div>

                  {catBooks.length > 0 ? (
                    catBooks.map(book => (
                      <div
                        key={book.id}
                        onClick={() => onSelectBook(book)}
                        className="group/book relative aspect-[2/3] w-28 sm:w-36 cursor-pointer [transform-style:preserve-3d] transition-all duration-700 hover:scale-110 hover:-translate-y-2 mx-auto"
                      >
                        <div className="absolute -inset-2 sm:-inset-4 border border-primary/0 group-hover/book:border-primary/20 rounded-lg sm:rounded-xl transition-all duration-500 opacity-0 group-hover/book:opacity-100">
                           <div className="absolute top-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-l-2 border-t-2 border-primary/60"></div>
                           <div className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-r-2 border-b-2 border-primary/60"></div>
                        </div>
                        
                        <div className="absolute inset-0 bg-[#0f172a] border border-white/10 rounded-md sm:rounded-lg overflow-hidden shadow-2xl group-hover/book:shadow-neon relative transition-all duration-500">
                          {book.coverUrl ? (
                            <img src={book.coverUrl} className="w-full h-full object-cover grayscale-[0.3] group-hover/book:grayscale-0 transition-all duration-700 group-hover/book:scale-105" alt="" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center" style={{ borderLeft: `4px solid ${getCoverColor(book.title)}` }}>
                              <span className="text-[6px] sm:text-[7px] font-black text-white/90 uppercase leading-tight line-clamp-3 tracking-widest mb-2">{book.title}</span>
                              <div className="w-6 sm:w-8 h-px bg-primary/20"></div>
                              <span className="material-symbols-outlined text-primary/10 text-2xl sm:text-4xl mt-2 animate-pulse">qr_code_2</span>
                            </div>
                          )}
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/50 shadow-neon-sm -translate-y-full group-hover/book:animate-[scan_2s_linear_infinite] pointer-events-none opacity-0 group-hover/book:opacity-100"></div>

                          {/* Refined Book Title Overlay - Contained within borders */}
                          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover/book:opacity-100 transition-all duration-500 translate-y-2 group-hover/book:translate-y-0 pointer-events-none">
                            <p className="text-[8px] sm:text-[10px] font-black text-primary truncate uppercase tracking-widest text-center shadow-black drop-shadow-md">
                              {book.title}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 sm:col-span-3 md:col-span-4 h-48 sm:h-72 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl sm:rounded-3xl group/empty-sector">
                      <span className="material-symbols-outlined text-4xl sm:text-6xl text-white/5 mb-4 sm:mb-6 group-hover/empty-sector:animate-bounce transition-all">database_off</span>
                      <p className="text-[8px] sm:text-[10px] text-text-sub/40 font-black uppercase tracking-[0.3em] sm:tracking-[0.5em]">Sector_Unallocated</p>
                    </div>
                  )}

                  {catBooks.length < SHELF_CAPACITY && Array.from({ length: SHELF_CAPACITY - catBooks.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="hidden sm:flex aspect-[2/3] w-28 sm:w-36 rounded-lg border border-white/[0.03] bg-white/[0.005] items-center justify-center group/empty transition-all hover:bg-white/[0.02] hover:border-primary/20 relative mx-auto">
                      <span className="material-symbols-outlined text-white/5 group-hover/empty:text-primary/30 transition-all duration-500 group-hover/empty:scale-125">add_circle</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* CONTROLS & HUD FOOTER */}
      <footer className={`z-[130] p-4 sm:p-10 bg-black/60 backdrop-blur-3xl border-t border-primary/10 transition-all duration-1000 ${hasEntered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
          
          <div className="flex items-center gap-6 sm:gap-12 w-full sm:w-auto justify-between sm:justify-start">
             <div className="flex flex-col">
               <span className="text-[7px] sm:text-[8px] text-text-sub uppercase font-black tracking-widest mb-1">DATA_STREAM</span>
               <div className="flex items-center gap-2 sm:gap-3">
                 <div className="flex gap-0.5">
                   {[1, 2, 3, 4].map(i => <div key={i} className="w-0.5 sm:w-1 h-2 sm:h-3 bg-primary/40 rounded-sm animate-[pulse_1s_infinite]" style={{ animationDelay: `${i * 100}ms` }}></div>)}
                 </div>
                 <span className="text-[8px] sm:text-[10px] font-black text-primary tracking-[0.1em] sm:tracking-[0.2em]">CONNECTED</span>
               </div>
             </div>
             
             <div className="h-10 sm:h-12 w-px bg-primary/10 hidden sm:block"></div>
             
             <div className="flex items-center gap-4 sm:gap-10">
                <button 
                  onClick={handlePrev} 
                  disabled={activeLayer === 0 || isWarping}
                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded border flex items-center justify-center transition-all ${activeLayer === 0 || isWarping ? 'border-white/5 text-white/10' : 'border-primary/40 text-primary hover:bg-primary/10 hover:shadow-neon'}`}
                >
                  <span className="material-symbols-outlined font-bold text-xl">keyboard_double_arrow_up</span>
                </button>
                <div className="text-center min-w-[80px] sm:min-w-[140px] group/nav">
                  <p className="text-[7px] sm:text-[8px] text-text-sub uppercase tracking-[0.2em] sm:tracking-[0.4em] mb-1 group-hover/nav:text-primary transition-colors">SECTOR</p>
                  <p className="text-lg sm:text-2xl font-black text-white font-display tracking-widest whitespace-nowrap">
                    <span className="text-primary">0{activeLayer + 1}</span>
                    <span className="text-white/20 mx-1 sm:mx-2">/</span>
                    <span className="text-white/40">0{booksByCategory.length}</span>
                  </p>
                </div>
                <button 
                  onClick={handleNext} 
                  disabled={activeLayer === booksByCategory.length - 1 || isWarping}
                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded border flex items-center justify-center transition-all ${activeLayer === booksByCategory.length - 1 || isWarping ? 'border-white/5 text-white/10' : 'border-primary/40 text-primary hover:bg-primary/10 hover:shadow-neon'}`}
                >
                  <span className="material-symbols-outlined font-bold text-xl">keyboard_double_arrow_down</span>
                </button>
             </div>
          </div>

          <div className="flex flex-col items-end gap-3 sm:gap-4 w-full sm:w-auto">
             <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
               {booksByCategory.map((_, i) => (
                 <button 
                  key={i} 
                  onClick={() => goToLayer(i)}
                  className={`h-1 sm:h-1.5 rounded-full transition-all duration-700 ${i === activeLayer ? 'w-6 sm:w-10 bg-primary shadow-neon' : 'w-1.5 sm:w-2 bg-white/10 hover:bg-white/30'}`}
                 ></button>
               ))}
             </div>
             <div className="flex items-center gap-2 sm:gap-3 opacity-40 sm:opacity-100 w-full sm:w-auto justify-center sm:justify-end">
               <p className="text-[7px] sm:text-[8px] text-primary/30 uppercase font-black tracking-[0.2em] sm:tracking-[0.3em] italic">NAVIGATION_ACTIVE</p>
               <span className="material-symbols-outlined text-primary/20 text-[10px] sm:text-xs animate-spin-slow">settings_backup_restore</span>
             </div>
          </div>
        </div>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(500%); }
        }

        .animate-spin-slow {
          animation: spin 10s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes glitch {
          0% { transform: translate(0); text-shadow: none; }
          20% { transform: translate(-2px, 2px); text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff; }
          40% { transform: translate(-2px, -2px); text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff; }
          60% { transform: translate(2px, 2px); text-shadow: 2px 0 #00ffff, -2px 0 #ff00ff; }
          80% { transform: translate(2px, -2px); text-shadow: -2px 0 #00ffff, 2px 0 #ff00ff; }
          100% { transform: translate(0); text-shadow: none; }
        }

        .animate-glitch:hover {
          animation: glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite;
        }

        @keyframes neon-flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            text-shadow: 0 0 5px #00f2ff, 0 0 15px rgba(0, 242, 255, 0.4);
            opacity: 1;
          }
          20%, 22%, 24%, 55% {
            text-shadow: none;
            opacity: 0.8;
          }
        }
        
        .drop-shadow-neon {
          animation: neon-flicker 4s infinite alternate;
        }
      `}</style>
    </div>
  );
};

export default Library3DView;
