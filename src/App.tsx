/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { MangaDetail } from "./pages/MangaDetail";
import { Reader } from "./pages/Reader";
import { Profile } from "./pages/Profile";

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
      
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2">
               <div className="w-4 h-4 bg-accent/20 border border-accent rounded-sm flex items-center justify-center">
                 <span className="text-[8px] text-accent">M</span>
               </div>
               <span>MangaReader Bento • Built for speed</span>
            </div>
            <div className="mono lowercase">/api/mangadex.org</div>
          </div>
          
          <div className="border-t border-border/40 pt-6 mt-2">
            <p className="text-[10px] md:text-xs text-gray-500/60 leading-relaxed font-serif text-center max-w-4xl mx-auto">
              Este site é apenas um indexador de links externos. Não hospedamos nem fazemos upload de nenhum vídeo, arquivo de imagem ou mangá em nossos servidores. Todos os conteúdos são fornecidos por terceiros através de APIs públicas (MangaDex). Se você é o detentor dos direitos autorais e deseja a remoção de algum conteúdo, entre em contato.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Home />
      },
      {
        path: "/search",
        element: <Search />
      },
      {
        path: "/manga/:id",
        element: <MangaDetail />
      },
      {
        path: "/reader/:chapterId",
        element: <Reader />
      },
      {
        path: "/chapter/:chapterId",
        element: <Reader /> // fallback for old links
      },
      {
        path: "/profile",
        element: <Profile />
      }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
