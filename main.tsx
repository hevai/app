import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "sonner";
import { ChainProvider } from "./contexts/network";
import { IdentityProvider } from "./contexts/identity";
import { SessionProvider } from "./hooks/use-session";
import { CatalogProvider } from "./contexts/catalog";
import { ProjectsProvider } from "./contexts/projects";
import { ScopeProvider } from "./contexts/scope";
import App from "./App";
import "./styles.css";
import { isDesktop } from "./lib/platform";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const Router = isDesktop() ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThirdwebProvider>
      <QueryClientProvider client={queryClient}>
        <ChainProvider>
          <SessionProvider>
            <IdentityProvider>
              <CatalogProvider>
                <ProjectsProvider>
                  <ScopeProvider>
                   <Router>
                   <App />
                  <Toaster
                    theme="dark"
                    position="bottom-right"
                    toastOptions={{
                      style: {
                        background: "#191c21",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "#f5f4f2",
                      },
                    }}
                  />
                  </Router>
                  </ScopeProvider>
                </ProjectsProvider>
              </CatalogProvider>
            </IdentityProvider>
          </SessionProvider>
        </ChainProvider>
      </QueryClientProvider>
    </ThirdwebProvider>
  </StrictMode>,
);
