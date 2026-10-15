import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, LogIn, LogOut, User } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

export function Navbar() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, loading, loginWithGoogle, logout } = useAuth();

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      inputRef.current?.blur();
    } else {
      navigate(`/search`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 min-h-16 py-3 md:py-0 flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center font-bold text-background group-hover:rotate-12 transition-transform">
            M
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Reader</span>
        </Link>
        
        <div className="order-last w-full md:order-none md:w-auto md:flex-1 max-w-xl mx-auto">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-accent transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search mangas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-lg py-2 pl-11 pr-14 text-sm text-foreground focus:outline-none focus:border-accent transition-all placeholder:text-gray-500 mono"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-[10px] text-gray-500 font-bold bg-dark px-1.5 py-0.5 rounded border border-border">Ctrl K</span>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end w-[140px] shrink-0">
          {!loading && (
            user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold truncate max-w-[80px]">{user.displayName?.split(' ')[0]}</span>
                  <span className="text-[8px] uppercase tracking-widest text-accent mono">Logged in</span>
                </div>
                <Link to="/profile" className="hover:opacity-80 transition-opacity">
                  {user.photoURL ? (
                     <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-border object-cover" referrerPolicy="no-referrer" />
                  ) : (
                     <div className="w-8 h-8 rounded-full bg-dark border border-border flex items-center justify-center text-gray-400">
                       <User className="w-4 h-4" />
                     </div>
                  )}
                </Link>
                <button onClick={logout} className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg bg-dark/50 border border-border hover:border-red-400/50" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-accent hover:text-accent transition-colors text-xs font-bold uppercase tracking-widest text-gray-300"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
