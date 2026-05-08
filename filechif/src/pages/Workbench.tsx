import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";

type Format = "docx" | "pdf";
type InputMode = "file" | "paste";
type InputKind = "markdown" | "text" | "docx" | "unknown";

type HealthData = {
  app_name: string;
  version: string;
  status: string;
};

type ConvertRequest = {
  input_path: string;
  output_path: string;
  template_path?: string | null;
};

type TextConvertRequest = {
  content: string;
  output_path: string;
  template_path?: string | null;
  source_name?: string | null;
};

type ConvertData = {
  job_id: string;
  output_path: string;
  format: string;
  template_path?: string | null;
};

type HistoryRecord = {
  record_id: string;
  job_id: string;
  input_path: string;
  output_path: string;
  template_path?: string | null;
  format: string;
  status: string;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
};

type TemplateRecord = {
  template_id: string;
  name: string;
  path: string;
  created_at: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T | null;
  error?: { code: string; message: string } | null;
  trace_id: string;
};

type HistoryFilter = "all" | "success" | "failed";

const commandByFormat: Record<Format, string> = {
  docx: "convert_markdown_to_docx",
  pdf: "convert_markdown_to_pdf",
};

const textCommandByFormat: Record<Format, string> = {
  docx: "convert_text_to_docx",
  pdf: "convert_text_to_pdf",
};

const formatExtensions: Record<Format, string> = {
  docx: "docx",
  pdf: "pdf",
};

const supportedInputExtensions = ["md", "markdown", "txt", "docx"];

function replaceExtension(path: string, extension: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return "";
  }

  const separatorIndex = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex > separatorIndex) {
    return `${trimmed.slice(0, dotIndex + 1)}${extension}`;
  }

  return `${trimmed}.${extension}`;
}

function extensionOf(path: string) {
  const cleanPath = path.split("?")[0].split("#")[0];
  const separatorIndex = Math.max(cleanPath.lastIndexOf("/"), cleanPath.lastIndexOf("\\"));
  const dotIndex = cleanPath.lastIndexOf(".");
  if (dotIndex <= separatorIndex) {
    return "";
  }
  return cleanPath.slice(dotIndex + 1).toLowerCase();
}

function inputKindFromPath(path: string): InputKind {
  const extension = extensionOf(path);
  if (extension === "md" || extension === "markdown") {
    return "markdown";
  }
  if (extension === "txt") {
    return "text";
  }
  if (extension === "docx") {
    return "docx";
  }
  return "unknown";
}

function recommendedFormatForPath(path: string): Format {
  return inputKindFromPath(path) === "docx" ? "pdf" : "docx";
}

function formatStatus(record: HistoryRecord) {
  return record.status === "success" ? "成功" : "失败";
}

function summarizeError(message?: string | null) {
  if (!message) {
    return "";
  }

  const firstLine = message.split("\n").find((line) => line.trim());
  return firstLine ? firstLine.replace(/^.*?:\s*/, "").trim() : message;
}

function errorHint(error?: { code: string; message: string } | null) {
  if (!error) {
    return "";
  }
  if (error.code === "PANDOC_UNAVAILABLE") {
    return "未检测到 pandoc。请安装 pandoc，或在设置页检查依赖状态。";
  }
  if (error.code === "CONVERT_FAILED" && error.message.includes("typst")) {
    return "PDF 转换依赖 typst。请安装 typst，或在设置页检查依赖状态。";
  }
  if (error.code === "INVALID_OUTPUT_EXTENSION") {
    return "输出文件后缀需要和当前格式一致，例如 .docx 或 .pdf。";
  }
  if (error.code === "INPUT_NOT_FOUND") {
    return "输入文件不存在，请重新选择 Markdown 文件。";
  }
  if (error.code === "TEMPLATE_NOT_FOUND") {
    return "模板文件不存在，请重新选择 DOCX 模板。";
  }
  return "";
}

export default function Workbench() {
  const [health, setHealth] = useState<string>("未连接");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [format, setFormat] = useState<Format>("docx");
  const [inputPath, setInputPath] = useState("");
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [pastedSourceName, setPastedSourceName] = useState("pasted-markdown");
  const [outputPath, setOutputPath] = useState("");
  const [templatePath, setTemplatePath] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ApiResponse<ConvertData> | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [notice, setNotice] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const commandName = useMemo(() => commandByFormat[format], [format]);
  const filteredHistory = useMemo(
    () =>
      history.filter((record) => historyFilter === "all" || record.status === historyFilter),
    [history, historyFilter],
  );
  const canConvert = Boolean(
    outputPath.trim() && (inputMode === "file" ? inputPath.trim() : pastedMarkdown.trim()),
  );
  const inputKind = inputMode === "file" ? inputKindFromPath(inputPath) : "markdown";
  const preflightItems = [
    {
      label: "输入来源",
      ok: inputMode === "file" ? Boolean(inputPath.trim()) && inputKind !== "unknown" : Boolean(pastedMarkdown.trim()),
      detail:
        inputMode === "file"
          ? inputPath
            ? inputKind === "unknown"
              ? `暂不支持 .${extensionOf(inputPath) || "unknown"}`
              : `${inputKind.toUpperCase()} 文件`
            : "等待选择或拖入文件"
          : pastedMarkdown.trim()
            ? "已粘贴 Markdown 文本"
            : "等待粘贴 Markdown",
    },
    {
      label: "输出目标",
      ok: Boolean(outputPath.trim()),
      detail: outputPath || "等待选择输出路径",
    },
    {
      label: "输出格式",
      ok: true,
      detail: format.toUpperCase(),
    },
    {
      label: "模板",
      ok: true,
      detail: templatePath.trim() ? "已选择 DOCX 模板" : format === "docx" ? "未选择模板，将使用默认样式" : "PDF 当前不需要 DOCX 模板",
    },
    {
      label: "AI 字段识别",
      ok: true,
      detail: "预留能力，后续接入 DeepSeek API",
    },
  ];

  const updateFormat = (nextFormat: Format) => {
    setFormat(nextFormat);
    setOutputPath((current) => replaceExtension(current || inputPath, formatExtensions[nextFormat]));
  };

  const applyInputPath = (path: string) => {
    const kind = inputKindFromPath(path);
    if (!supportedInputExtensions.includes(extensionOf(path))) {
      setNotice(`暂不支持该文件类型：.${extensionOf(path) || "unknown"}`);
      return;
    }

    const nextFormat = recommendedFormatForPath(path);
    setInputMode("file");
    setInputPath(path);
    setFormat(nextFormat);
    setOutputPath(replaceExtension(path, formatExtensions[nextFormat]));
    setNotice(
      kind === "docx"
        ? "已识别 DOCX 文件，建议输出 PDF。"
        : "已识别 Markdown/TXT 文件，建议输出 DOCX。",
    );
  };

  const refreshHistory = async () => {
    const response = await invoke<ApiResponse<HistoryRecord[]>>("list_history");
    if (response.ok && response.data) {
      setHistory(response.data.slice().reverse());
    }
  };

  const refreshTemplates = async () => {
    const response = await invoke<ApiResponse<TemplateRecord[]>>("list_templates");
    if (response.ok && response.data) {
      setTemplates(response.data);
    }
  };

  const handleHealthCheck = async () => {
    const response = await invoke<ApiResponse<HealthData>>("health_check");
    setHealth(
      response.ok && response.data
        ? `${response.data.app_name} ${response.data.version} ${response.data.status}`
        : response.error?.message ?? "连接失败",
    );
  };

  const handleConvert = async () => {
    setIsConverting(true);
    setNotice("");
    setResult(null);

    try {
      const response =
        inputMode === "file"
          ? await invoke<ApiResponse<ConvertData>>(commandName, {
              request: {
                input_path: inputPath,
                output_path: outputPath,
                template_path: templatePath.trim() ? templatePath : null,
              } satisfies ConvertRequest,
            })
          : await invoke<ApiResponse<ConvertData>>(textCommandByFormat[format], {
              request: {
                content: pastedMarkdown,
                output_path: outputPath,
                template_path: templatePath.trim() ? templatePath : null,
                source_name: pastedSourceName.trim() ? pastedSourceName : null,
              } satisfies TextConvertRequest,
            });
      setResult(response);
      await refreshHistory();
    } catch (error) {
      setResult({
        ok: false,
        error: {
          code: "INVOKE_FAILED",
          message: String(error),
        },
        trace_id: "frontend",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleSelectInput = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Markdown",
          extensions: ["md", "markdown"],
        },
      ],
    });

    if (typeof selected === "string") {
      applyInputPath(selected);
    }
  };

  const handleSelectOutput = async () => {
    const selected = await save({
      defaultPath: outputPath || replaceExtension(inputPath, formatExtensions[format]),
      filters: [
        {
          name: format.toUpperCase(),
          extensions: [formatExtensions[format]],
        },
      ],
    });

    if (typeof selected === "string") {
      setOutputPath(replaceExtension(selected, formatExtensions[format]));
    }
  };

  const handleSelectTemplate = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Word Template",
          extensions: ["docx"],
        },
      ],
    });

    if (typeof selected === "string") {
      setTemplatePath(selected);
    }
  };

  const addCurrentTemplate = async () => {
    if (!templatePath.trim()) {
      setNotice("请先选择模板文件");
      return;
    }

    const response = await invoke<ApiResponse<TemplateRecord>>("add_template", {
      path: templatePath,
      name: templateName.trim() ? templateName : null,
    });

    if (response.ok && response.data) {
      setTemplatePath(response.data.path);
      setTemplateName("");
      setNotice("模板已加入模板库");
      await refreshTemplates();
    } else {
      setNotice(response.error?.message ?? "添加模板失败");
    }
  };

  const removeTemplate = async (templateId: string) => {
    const response = await invoke<ApiResponse<null>>("remove_template", {
      templateId,
    });

    if (response.ok) {
      setNotice("模板已删除");
      await refreshTemplates();
    } else {
      setNotice(response.error?.message ?? "删除模板失败");
    }
  };

  const openOutputFile = async (path: string) => {
    await invoke<ApiResponse<null>>("open_output_file", { path });
  };

  const revealOutputFile = async (path: string) => {
    await invoke<ApiResponse<null>>("reveal_output_file", { path });
  };

  const copyPath = async (path: string) => {
    await navigator.clipboard.writeText(path);
    setNotice("路径已复制");
  };

  const rerunHistoryRecord = async (record: HistoryRecord) => {
    const nextFormat = record.format === "pdf" ? "pdf" : "docx";
    setFormat(nextFormat);
    setInputPath(record.input_path);
    setOutputPath(record.output_path);
    setTemplatePath(record.template_path ?? "");
    setNotice("正在重新转换历史任务...");
    setIsConverting(true);
    setResult(null);

    try {
      const response = await invoke<ApiResponse<ConvertData>>(commandByFormat[nextFormat], {
        request: {
          input_path: record.input_path,
          output_path: record.output_path,
          template_path: record.template_path ?? null,
        },
      });
      setResult(response);
      setNotice(response.ok ? "重新转换完成" : "重新转换失败");
      await refreshHistory();
    } catch (error) {
      setResult({
        ok: false,
        error: {
          code: "INVOKE_FAILED",
          message: String(error),
        },
        trace_id: "frontend",
      });
      setNotice("重新转换失败");
    } finally {
      setIsConverting(false);
    }
  };

  useEffect(() => {
    handleHealthCheck().catch(() => setHealth("连接失败"));
    refreshHistory().catch(() => setHistory([]));
    refreshTemplates().catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDraggingFile(true);
        }
        if (event.payload.type === "leave") {
          setIsDraggingFile(false);
        }
        if (event.payload.type === "drop") {
          setIsDraggingFile(false);
          const firstPath = event.payload.paths[0];
          if (firstPath) {
            applyInputPath(firstPath);
          }
        }
      })
      .then((cleanup) => {
        unlisten = cleanup;
      })
      .catch(() => setNotice("拖拽监听初始化失败，可继续使用文件选择。"));

    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="workspace-toolbar">
        <div>
          <h1>工作台</h1>
          <p>选择文件或粘贴内容，快速输出 DOCX/PDF。</p>
        </div>
        <div className="toolbar-actions">
          <span className="status-pill">后端：{health}</span>
          <button type="button" onClick={handleHealthCheck}>
            检测
          </button>
        </div>
      </section>

      {notice ? <div className="notice floating-notice">{notice}</div> : null}

      <section className="workspace-grid">
        <form className="panel task-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="panel-title">
            <span className="panel-kicker">Step 1</span>
            <h2>创建转换任务</h2>
            <p>选择本地文件，或直接粘贴从 AI 对话工具复制出的 Markdown。</p>
          </div>

          <div className="input-mode-tabs" role="group" aria-label="输入来源">
            <button
              type="button"
              className={inputMode === "file" ? "selected" : ""}
              onClick={() => setInputMode("file")}
            >
              本地文件
            </button>
            <button
              type="button"
              className={inputMode === "paste" ? "selected" : ""}
              onClick={() => setInputMode("paste")}
            >
              粘贴 Markdown
            </button>
          </div>

          <div className={isDraggingFile ? "drop-zone dragging" : "drop-zone"}>
            <strong>拖入文件自动识别</strong>
            <span>支持 .md / .markdown / .txt / .docx；DOCX 默认推荐输出 PDF。</span>
          </div>

          {inputMode === "file" ? (
            <label className="field-card">
              <span className="input-label">输入 Markdown</span>
              <div className="path-row">
                <input
                  value={inputPath}
                  onChange={(event) => {
                    setInputPath(event.target.value);
                    if (!outputPath) {
                      setOutputPath(replaceExtension(event.target.value, formatExtensions[format]));
                    }
                  }}
                  placeholder="/path/to/input.md"
                />
                <button type="button" className="secondary-action" onClick={handleSelectInput}>
                  选择
                </button>
              </div>
            </label>
          ) : (
            <>
              <label className="field-card">
                <span className="input-label">来源名称</span>
                <input
                  value={pastedSourceName}
                  onChange={(event) => setPastedSourceName(event.target.value)}
                  placeholder="例如：客户方案初稿"
                />
              </label>
              <label className="field-card">
                <span className="input-label">粘贴 Markdown</span>
                <textarea
                  value={pastedMarkdown}
                  onChange={(event) => setPastedMarkdown(event.target.value)}
                  placeholder={"# 标题\n\n把 AI 对话工具里复制出来的 Markdown 粘贴到这里。"}
                  rows={10}
                />
              </label>
            </>
          )}

          <label className="field-card">
            <span className="input-label">输出文件</span>
            <div className="path-row">
              <input
                value={outputPath}
                onChange={(event) => setOutputPath(event.target.value)}
                placeholder={format === "docx" ? "/path/to/output.docx" : "/path/to/output.pdf"}
              />
              <button type="button" className="secondary-action" onClick={handleSelectOutput}>
                另存为
              </button>
            </div>
          </label>

          <label className={format === "docx" ? "field-card template-focus" : "field-card"}>
            <span className="input-label">DOCX 模板（可选）</span>
            <div className="path-row">
              <input
                value={templatePath}
                onChange={(event) => setTemplatePath(event.target.value)}
                placeholder="可选，仅 DOCX reference-doc"
              />
              <button type="button" className="secondary-action" onClick={handleSelectTemplate}>
                选择
              </button>
            </div>
          </label>

          {format === "docx" ? (
            <div className="template-callout">
              <strong>模板选择</strong>
              <span>{templatePath ? "当前会使用已选择模板套版。" : "未选择模板时，pandoc 会使用默认 DOCX 样式。"}</span>
            </div>
          ) : null}

          <label className="field-card compact-field">
            <span className="input-label">保存到模板库</span>
            <div className="path-row">
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="加入模板库时使用，可留空"
              />
              <button type="button" className="secondary-action" onClick={addCurrentTemplate}>
                加入模板库
              </button>
            </div>
          </label>

          {templates.length > 0 ? (
            <div className="template-library">
              <span className="section-label">模板库</span>
              {templates.map((template) => (
                <article
                  className={template.path === templatePath ? "template-item selected" : "template-item"}
                  key={template.template_id}
                >
                  <button type="button" onClick={() => setTemplatePath(template.path)}>
                    {template.name}
                  </button>
                  <button type="button" onClick={() => removeTemplate(template.template_id)}>
                    删除
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          <div className="format-row" role="group" aria-label="输出格式">
            <button
              type="button"
              className={format === "docx" ? "format-card selected" : "format-card"}
              onClick={() => updateFormat("docx")}
            >
              <strong>DOCX</strong>
              <span>适合 Word 交付和模板套版</span>
            </button>
            <button
              type="button"
              className={format === "pdf" ? "format-card selected" : "format-card"}
              onClick={() => updateFormat("pdf")}
            >
              <strong>PDF</strong>
              <span>适合定稿预览和直接发送</span>
            </button>
          </div>

          <button
            type="button"
            className="primary"
            disabled={isConverting || !canConvert}
            onClick={handleConvert}
          >
            {isConverting ? "转换中..." : "开始转换"}
          </button>
        </form>

        <section className="panel result-panel">
          <div className="panel-title">
            <span className="panel-kicker">Step 2</span>
            <h2>执行结果</h2>
            <p>转换完成后可直接打开文件或定位到输出目录。</p>
          </div>
          {result ? (
            <>
              {result.ok && result.data ? (
                <div className="result-card success-card">
                  <span className="status-badge success-badge">转换成功</span>
                  <h3>{result.data.format.toUpperCase()} 已生成</h3>
                  <p className="path-text">{result.data.output_path}</p>
                  <div className="quick-actions">
                    <button type="button" onClick={() => openOutputFile(result.data!.output_path)}>
                      打开文件
                    </button>
                    <button type="button" onClick={() => revealOutputFile(result.data!.output_path)}>
                      显示位置
                    </button>
                    <button type="button" onClick={() => copyPath(result.data!.output_path)}>
                      复制路径
                    </button>
                  </div>
                </div>
              ) : null}
              {!result.ok ? (
                <div className="result-card failed-card">
                  <span className="status-badge failed-badge">转换失败</span>
                  <h3>{result.error?.code ?? "UNKNOWN_ERROR"}</h3>
                  <p>{summarizeError(result.error?.message)}</p>
                  {errorHint(result.error) ? (
                    <div className="error-hint">{errorHint(result.error)}</div>
                  ) : null}
                </div>
              ) : null}
              <details className="raw-details">
                <summary>查看原始响应</summary>
                <pre className={result.ok ? "result success" : "result failed"}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </>
          ) : (
            <div className="empty-state polished-empty">
              <strong>等待转换任务</strong>
              <span>选择 Markdown 文件后，点击开始转换。</span>
            </div>
          )}

          <section className="preflight-panel">
            <div className="panel-title compact-title">
              <span className="panel-kicker">Preflight</span>
              <h2>转换前检查</h2>
            </div>
            <div className="preflight-list">
              {preflightItems.map((item) => (
                <div className="preflight-item" key={item.label}>
                  <span className={item.ok ? "preflight-dot ok" : "preflight-dot bad"} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ai-placeholder">
            <div>
              <span className="panel-kicker">AI Field Mapping</span>
              <h2>字段识别预留区</h2>
              <p>后续接入 DeepSeek 后，这里会展示模板字段、自动匹配结果和人工确认入口。</p>
            </div>
            <button type="button" disabled>
              待接入
            </button>
          </section>
        </section>
      </section>

      <section className="panel history-panel">
        <div className="panel-heading">
          <h2>历史记录</h2>
          <div className="history-toolbar">
            <div className="filter-row" role="group" aria-label="历史筛选">
              <button
                type="button"
                className={historyFilter === "all" ? "selected" : ""}
                onClick={() => setHistoryFilter("all")}
              >
                全部
              </button>
              <button
                type="button"
                className={historyFilter === "success" ? "selected" : ""}
                onClick={() => setHistoryFilter("success")}
              >
                成功
              </button>
              <button
                type="button"
                className={historyFilter === "failed" ? "selected" : ""}
                onClick={() => setHistoryFilter("failed")}
              >
                失败
              </button>
            </div>
            <button type="button" onClick={refreshHistory}>
              刷新历史
            </button>
          </div>
        </div>
        {filteredHistory.length > 0 ? (
          <div className="history-list">
            {filteredHistory.map((record) => (
              <article className="history-item" key={record.record_id}>
                <div>
                  <strong className={record.status === "success" ? "history-status success-badge" : "history-status failed-badge"}>
                    {formatStatus(record)}
                  </strong>
                  <span className="format-chip">{record.format.toUpperCase()}</span>
                  <time>{new Date(record.created_at).toLocaleString()}</time>
                </div>
                <p className="path-text">{record.input_path}</p>
                <p className="path-text">{record.output_path}</p>
                <div className="history-actions">
                  <button type="button" onClick={() => copyPath(record.input_path)}>
                    复制输入
                  </button>
                  <button type="button" onClick={() => copyPath(record.output_path)}>
                    复制输出
                  </button>
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={() => rerunHistoryRecord(record)}
                  >
                    重新转换
                  </button>
                  {record.status === "success" ? (
                    <>
                    <button type="button" onClick={() => openOutputFile(record.output_path)}>
                      打开文件
                    </button>
                    <button type="button" onClick={() => revealOutputFile(record.output_path)}>
                      显示位置
                    </button>
                    </>
                  ) : null}
                </div>
                {record.error_message ? (
                  <p className="error-text">{summarizeError(record.error_message)}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">暂无历史记录</div>
        )}
      </section>
    </main>
  );
}
