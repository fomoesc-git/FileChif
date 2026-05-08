import { useState } from "react";
import Settings from "./pages/Settings";
import Workbench from "./pages/Workbench";

type View = "workbench" | "settings" | "about";

export default function App() {
  const [view, setView] = useState<View>("workbench");

  return (
    <>
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark">FC</div>
          <div>
            <strong>FileChif</strong>
            <span>Markdown 文档交付工作台</span>
          </div>
        </div>
        <nav className="app-nav">
          <button
            type="button"
            className={view === "workbench" ? "selected" : ""}
            onClick={() => setView("workbench")}
          >
            工作台
          </button>
          <button
            type="button"
            className={view === "settings" ? "selected" : ""}
            onClick={() => setView("settings")}
          >
            设置
          </button>
          <button
            type="button"
            className={view === "about" ? "selected" : ""}
            onClick={() => setView("about")}
          >
            关于
          </button>
        </nav>
      </header>
      {view === "workbench" ? <Workbench /> : <Settings initialSection={view} />}
    </>
  );
}
