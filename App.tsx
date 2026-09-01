import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Rail } from "./components/rail";
import { Topbar } from "./components/topbar";
import { Canvas } from "./components/canvas";
import { Home } from "./pages/home";
import { ProjectPage } from "./pages/project";
import { OrgPage } from "./pages/org";
import { ConnectLocalPage } from "./pages/connect-local";
import { DeepLinkHandler } from "./components/deep-link";
import { stripLocale } from "./contexts/locale";

export default function App() {
  const [canvasOpen, setCanvasOpen] = useState(false);

  if (stripLocale(window.location.pathname) === "/connect-local") {
    return <ConnectLocalPage />;
  }

  return (
    <>
      <DeepLinkHandler />
      <div className="backdrop" />
      <div className="shell">
        <Rail onCreate={() => setCanvasOpen(true)} />
        <div className="column">
          <Topbar />
          <main className="main">
            <div className="stage">
              <Routes>
                <Route path="/" element={<Home onCreate={() => setCanvasOpen(true)} />} />
                <Route path="/project/:id" element={<ProjectPage />} />
                <Route path="/org/:id" element={<OrgPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
      <Canvas open={canvasOpen} onClose={() => setCanvasOpen(false)} />
    </>
  );
}
