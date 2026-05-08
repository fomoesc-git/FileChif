import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type DependencyStatus = {
  name: string;
  available: boolean;
  version?: string | null;
  message?: string | null;
};

type AppStatusData = {
  app_name: string;
  app_version: string;
  build_time: string;
  release_channel: string;
  data_dir: string;
  history_path: string;
  templates_path: string;
  dependencies: DependencyStatus[];
  release_info: {
    repository_url: string;
    release_notes_url: string;
    internal_install_url: string;
    update_policy: string;
  };
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T | null;
  error?: { code: string; message: string } | null;
  trace_id: string;
};

function installHint(name: string) {
  if (name === "pandoc") {
    return "安装命令：brew install pandoc";
  }
  if (name === "typst") {
    return "安装命令：brew install typst";
  }
  return "";
}

export default function Settings() {
  const [status, setStatus] = useState<AppStatusData | null>(null);
  const [error, setError] = useState("");

  const refreshStatus = async () => {
    const response = await invoke<ApiResponse<AppStatusData>>("get_app_status");
    if (response.ok && response.data) {
      setStatus(response.data);
      setError("");
    } else {
      setError(response.error?.message ?? "状态读取失败");
    }
  };

  useEffect(() => {
    refreshStatus().catch((reason) => setError(String(reason)));
  }, []);

  const openUrl = async (url: string) => {
    const response = await invoke<ApiResponse<null>>("open_url", { url });
    if (!response.ok) {
      setError(response.error?.message ?? "打开链接失败");
    }
  };

  return (
    <main className="app-shell">
      <section className="toolbar">
        <div>
          <h1>设置</h1>
          <p>应用状态与本地依赖</p>
        </div>
        <button type="button" onClick={refreshStatus}>
          刷新状态
        </button>
      </section>

      {error ? <div className="notice">{error}</div> : null}

      {status ? (
        <section className="settings-grid">
          <article className="panel">
            <h2>应用</h2>
            <dl className="info-list">
              <dt>名称</dt>
              <dd>{status.app_name}</dd>
              <dt>版本</dt>
              <dd>{status.app_version}</dd>
              <dt>构建日期</dt>
              <dd>{status.build_time}</dd>
              <dt>发布通道</dt>
              <dd>{status.release_channel}</dd>
              <dt>数据目录</dt>
              <dd>{status.data_dir}</dd>
              <dt>历史记录</dt>
              <dd>{status.history_path}</dd>
              <dt>模板库</dt>
              <dd>{status.templates_path}</dd>
            </dl>
          </article>

          <article className="panel">
            <h2>版本与更新</h2>
            <dl className="info-list">
              <dt>开源仓库</dt>
              <dd>{status.release_info.repository_url}</dd>
              <dt>更新策略</dt>
              <dd>{status.release_info.update_policy}</dd>
            </dl>
            <div className="quick-actions">
              <button type="button" onClick={() => openUrl(status.release_info.repository_url)}>
                打开 GitHub
              </button>
              <button type="button" onClick={() => openUrl(status.release_info.release_notes_url)}>
                查看发布说明
              </button>
              <button type="button" onClick={() => openUrl(status.release_info.internal_install_url)}>
                查看安装说明
              </button>
            </div>
          </article>

          <article className="panel">
            <h2>依赖</h2>
            <div className="dependency-list">
              {status.dependencies.map((dependency) => (
                <div className="dependency-item" key={dependency.name}>
                  <strong>{dependency.name}</strong>
                  <span className={dependency.available ? "status-ok" : "status-bad"}>
                    {dependency.available ? "可用" : "不可用"}
                  </span>
                  <p>{dependency.version ?? dependency.message ?? "无版本信息"}</p>
                  {!dependency.available ? (
                    <p className="install-hint">{installHint(dependency.name)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : (
        <section className="panel">
          <div className="empty-state">正在读取状态</div>
        </section>
      )}
    </main>
  );
}
