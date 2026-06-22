import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PdfConverter } from "@/components/PdfConverter";
import { PdfReader } from "@/components/PdfReader";
import { FileImage, BookOpen } from "lucide-react";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Navbar() {
  const [location] = useLocation();

  return (
    <header className="border-b bg-white dark:bg-slate-950 shadow-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <FileImage className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
            PDF Tools
          </span>
        </div>

        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
          <Link href="/" className="inline-block">
            <div className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              location === '/' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
            }`} data-testid="nav-converter">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4" />
                <span className="hidden sm:inline">Images to PDF</span>
              </div>
            </div>
          </Link>
          <Link href="/read" className="inline-block">
            <div className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              location === '/read' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
            }`} data-testid="nav-reader">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">PDF Reader</span>
              </div>
            </div>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 py-8">
        {children}
      </main>
      <footer className="py-6 text-center">
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
          Desarrollada por Javier Soto
        </p>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={PdfConverter} />
      <Route path="/read" component={PdfReader} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
