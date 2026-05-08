import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

type Format = "docx" | "pdf";

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

const formatExtensions: Record<Format, string> = {
  docx: "docx",
  pdf: "pdf",
};

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
  const [format, setFormat] = useState<Format>("docx");
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [templatePath, setTemplatePath] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ApiResponse<ConvertData> | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [notice, setNotice] = useState("");

  const commandName = useMemo(() => commandByFormat[format], [format]);
  const filteredHistory = useMemo(
    () =>
      history.filter((record) => historyFilter === "all" || record.status === historyFilter),
    [history, historyFilter],
  );

  const updateFormat = (nextFormat: Format) => {
    setFormat(nextFormat);
    setOutputPath((current) => replaceExtension(current || inputPath, formatExtensions[nextFormat]));
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

    const request: ConvertRequest = {
      input_path: inputPath,
      output_path: outputPath,
      template_path: templatePath.trim() ? templatePath : null,
    };

    try {
      const response = await invoke<ApiResponse<ConvertData>>(commandName, {
        request,
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
      setInputPath(selected);
      setOutputPath((current) => current || replaceExtension(selected, formatExtensions[format]));
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

  return (
    <main className="app-shell">
      <section className="toolbar">
        <div>
          <h1>filechif</h1>
          <p>Markdown 转 DOCX / PDF 工作台</p>
        </div>
        <button type="button" onClick={handleHealthCheck}>
          后端状态：{health}
        </button>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}

      <section className="workspace-grid">
        <form className="panel" onSubmit={(event) => event.preventDefault()}>
          <h2>转换任务</h2>
          <label>
            输入 Markdown 路径
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
              <button type="button" onClick={handleSelectInput}>
                选择
              </button>
            </div>
          </label>
          <label>
            输出文件路径
            <div className="path-row">
              <input
                value={outputPath}
                onChange={(event) => setOutputPath(event.target.value)}
                placeholder={format === "docx" ? "/path/to/output.docx" : "/path/to/output.pdf"}
              />
              <button type="button" onClick={handleSelectOutput}>
                另存为
              </button>
            </div>
          </label>
          <label>
            模板路径
            <div className="path-row">
              <input
                value={templatePath}
                onChange={(event) => setTemplatePath(event.target.value)}
                placeholder="可选，仅 DOCX reference-doc"
              />
              <button type="button" onClick={handleSelectTemplate}>
                选择
              </button>
            </div>
          </label>
          <label>
            模板名称
            <div className="path-row">
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="加入模板库时使用，可留空"
              />
              <button type="button" onClick={addCurrentTemplate}>
                加入模板库
              </button>
            </div>
          </label>
          {templates.length > 0 ? (
            <div className="template-library">
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
              className={format === "docx" ? "selected" : ""}
              onClick={() => updateFormat("docx")}
            >
              DOCX
            </button>
            <button
              type="button"
              className={format === "pdf" ? "selected" : ""}
              onClick={() => updateFormat("pdf")}
            >
              PDF
            </button>
          </div>
          <button
            type="button"
            className="primary"
            disabled={isConverting}
            onClick={handleConvert}
          >
            {isConverting ? "转换中..." : "开始转换"}
          </button>
        </form>

        <section className="panel">
          <h2>执行结果</h2>
          {result ? (
            <>
              {result.ok && result.data ? (
                <div className="quick-actions">
                  <button type="button" onClick={() => openOutputFile(result.data!.output_path)}>
                    打开文件
                  </button>
                  <button type="button" onClick={() => revealOutputFile(result.data!.output_path)}>
                    显示位置
                  </button>
                </div>
              ) : null}
              <pre className={result.ok ? "result success" : "result failed"}>
                {JSON.stringify(result, null, 2)}
              </pre>
              {!result.ok && errorHint(result.error) ? (
                <div className="error-hint">{errorHint(result.error)}</div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">等待转换任务</div>
          )}
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
                  <strong>{formatStatus(record)}</strong>
                  <span>{record.format.toUpperCase()}</span>
                  <time>{new Date(record.created_at).toLocaleString()}</time>
                </div>
                <p>{record.input_path}</p>
                <p>{record.output_path}</p>
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
