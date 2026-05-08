import { useState } from "react";
import Settings from "./pages/Settings";
import Workbench from "./pages/Workbench";

type View = "workbench" | "settings";

export default function App() {
  const [view, setView] = useState<View>("workbench");

  return (
    <>
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
      </nav>
      {view === "workbench" ? <Workbench /> : <Settings />}
    </>
  );
}
