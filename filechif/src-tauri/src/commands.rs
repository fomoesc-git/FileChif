use crate::error::AppError;
use crate::models::{
    AboutData, ApiError, ApiResponse, AppStatusData, ConvertData, ConvertRequest,
    DependencyStatus, HealthData, HistoryRecord, ReleaseInfo, TemplateRecord,
};
use chrono::Utc;
use serde_json::Value;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use uuid::Uuid;

fn ok<T>(data: T) -> ApiResponse<T> {
    ApiResponse {
        ok: true,
        data: Some(data),
        error: None,
        trace_id: Uuid::new_v4().to_string(),
    }
}

fn err<T>(error: AppError) -> ApiResponse<T> {
    ApiResponse {
        ok: false,
        data: None,
        error: Some(ApiError {
            code: error.code().to_string(),
            message: error.to_string(),
        }),
        trace_id: Uuid::new_v4().to_string(),
    }
}

fn project_data_dir() -> PathBuf {
    #[cfg(test)]
    {
        return std::env::temp_dir().join("filechif-test-data");
    }

    #[cfg(not(test))]
    {
        system_data_dir()
    }
}

fn bundled_data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("data")
}

#[cfg(not(test))]
fn system_data_dir() -> PathBuf {
    if cfg!(target_os = "macos") {
        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("filechif");
        }
    }

    if let Some(data_home) = std::env::var_os("XDG_DATA_HOME") {
        return PathBuf::from(data_home).join("filechif");
    }

    if let Some(home) = std::env::var_os("HOME") {
        return PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("filechif");
    }

    bundled_data_dir()
}

fn history_path() -> PathBuf {
    ensure_data_file("history.json");
    project_data_dir().join("history.json")
}

fn templates_path() -> PathBuf {
    ensure_data_file("templates.json");
    project_data_dir().join("templates.json")
}

fn ensure_data_file(file_name: &str) {
    let target = project_data_dir().join(file_name);
    if target.exists() {
        return;
    }

    if let Some(parent) = target.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let source = bundled_data_dir().join(file_name);
    if source.exists() {
        let _ = fs::copy(source, &target);
    } else {
        let _ = fs::write(target, "[]");
    }
}

fn resolve_command_path(command_name: &str) -> PathBuf {
    let candidates = [
        PathBuf::from(command_name),
        PathBuf::from("/opt/homebrew/bin").join(command_name),
        PathBuf::from("/usr/local/bin").join(command_name),
        PathBuf::from("/usr/bin").join(command_name),
        PathBuf::from("/bin").join(command_name),
    ];

    candidates
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| PathBuf::from(command_name))
}

fn command_version(command_name: &str) -> DependencyStatus {
    let command_path = resolve_command_path(command_name);
    match Command::new(&command_path).arg("--version").output() {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let first_line = stdout.lines().next().map(|line| line.to_string());
            DependencyStatus {
                name: command_name.to_string(),
                available: true,
                version: first_line,
                message: None,
            }
        }
        Ok(output) => DependencyStatus {
            name: command_name.to_string(),
            available: false,
            version: None,
            message: Some(String::from_utf8_lossy(&output.stderr).trim().to_string()),
        },
        Err(error) => DependencyStatus {
            name: command_name.to_string(),
            available: false,
            version: None,
            message: Some(format!("{} ({})", error, command_path.display())),
        },
    }
}

fn normalize_path(value: &str, field_name: &str) -> Result<PathBuf, AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidParam(format!("{field_name} is required")));
    }

    let path = PathBuf::from(trimmed);
    if path.is_absolute() {
        Ok(path)
    } else {
        std::env::current_dir()
            .map_err(|e| AppError::Internal(e.to_string()))
            .map(|cwd| cwd.join(path))
    }
}

fn extension_lowercase(path: &Path) -> String {
    path.extension()
        .and_then(OsStr::to_str)
        .unwrap_or_default()
        .to_ascii_lowercase()
}

fn ensure_input_path(path: &Path) -> Result<(), AppError> {
    if !path.exists() {
        return Err(AppError::InputNotFound(path.display().to_string()));
    }
    if !path.is_file() {
        return Err(AppError::InvalidParam(format!(
            "input path must be a file: {}",
            path.display()
        )));
    }

    match extension_lowercase(path).as_str() {
        "md" | "markdown" => Ok(()),
        other => Err(AppError::InvalidInputExtension(other.to_string())),
    }
}

fn ensure_output_path(path: &Path, format: &str) -> Result<(), AppError> {
    let actual = extension_lowercase(path);
    if actual != format {
        return Err(AppError::InvalidOutputExtension {
            expected: format.to_string(),
            actual,
        });
    }

    let parent = path.parent().ok_or_else(|| {
        AppError::InvalidParam(format!("output path has no parent: {}", path.display()))
    })?;

    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| AppError::OutputDirNotWritable(e.to_string()))?;
    }

    let probe_path = parent.join(format!(".filechif-write-check-{}", Uuid::new_v4()));
    fs::write(&probe_path, b"ok").map_err(|e| AppError::OutputDirNotWritable(e.to_string()))?;
    let _ = fs::remove_file(probe_path);

    Ok(())
}

fn normalize_template(template_path: Option<String>) -> Result<Option<PathBuf>, AppError> {
    match template_path {
        Some(value) if !value.trim().is_empty() => {
            let path = normalize_path(&value, "template_path")?;
            if !path.exists() {
                return Err(AppError::TemplateNotFound(path.display().to_string()));
            }
            if !path.is_file() {
                return Err(AppError::InvalidParam(format!(
                    "template path must be a file: {}",
                    path.display()
                )));
            }
            Ok(Some(path))
        }
        _ => Ok(None),
    }
}

fn append_history(record: HistoryRecord) -> Result<(), AppError> {
    let path = history_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::Internal(e.to_string()))?;
    }

    let existing = fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string());
    let mut items: Vec<HistoryRecord> =
        serde_json::from_str(&existing).map_err(|e| AppError::Internal(e.to_string()))?;
    items.push(record);

    let content =
        serde_json::to_string_pretty(&items).map_err(|e| AppError::Internal(e.to_string()))?;
    fs::write(path, content).map_err(|e| AppError::Internal(e.to_string()))
}

fn read_templates() -> Result<Vec<TemplateRecord>, AppError> {
    let existing = fs::read_to_string(templates_path()).unwrap_or_else(|_| "[]".to_string());
    serde_json::from_str(&existing).map_err(|e| AppError::Internal(e.to_string()))
}

fn write_templates(records: &[TemplateRecord]) -> Result<(), AppError> {
    let path = templates_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::Internal(e.to_string()))?;
    }

    let content =
        serde_json::to_string_pretty(records).map_err(|e| AppError::Internal(e.to_string()))?;
    fs::write(path, content).map_err(|e| AppError::Internal(e.to_string()))
}

fn history_record(
    job_id: &str,
    request: &ConvertRequest,
    format: &str,
    status: &str,
    error: Option<&AppError>,
) -> HistoryRecord {
    HistoryRecord {
        record_id: Uuid::new_v4().to_string(),
        job_id: job_id.to_string(),
        input_path: request.input_path.clone(),
        output_path: request.output_path.clone(),
        template_path: request.template_path.clone(),
        format: format.to_string(),
        status: status.to_string(),
        error_code: error.map(|e| e.code().to_string()),
        error_message: error.map(ToString::to_string),
        created_at: Utc::now().to_rfc3339(),
    }
}

fn run_pandoc(
    input_path: &Path,
    output_path: &Path,
    template_path: Option<&Path>,
) -> Result<(), AppError> {
    let mut command = Command::new(resolve_command_path("pandoc"));
    command.arg(input_path).arg("-o").arg(output_path);

    if extension_lowercase(output_path) == "pdf" {
        command.arg(format!(
            "--pdf-engine={}",
            resolve_command_path("typst").display()
        ));
    }

    if let Some(template) = template_path {
        command.arg("--reference-doc").arg(template);
    }

    match command.output() {
        Ok(output) if output.status.success() => Ok(()),
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let message = if !stderr.is_empty() { stderr } else { stdout };
            Err(AppError::ConvertFailed(message))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            Err(AppError::PandocUnavailable(e.to_string()))
        }
        Err(e) => Err(AppError::Internal(e.to_string())),
    }
}

fn open_with_system(path: &Path, reveal: bool) -> Result<(), AppError> {
    if !path.exists() {
        return Err(AppError::InputNotFound(path.display().to_string()));
    }

    let status = if cfg!(target_os = "macos") {
        let mut command = Command::new("open");
        if reveal {
            command.arg("-R");
        }
        command.arg(path).status()
    } else if cfg!(target_os = "windows") {
        let target = if reveal {
            path.parent().unwrap_or(path)
        } else {
            path
        };
        Command::new("explorer").arg(target).status()
    } else {
        let target = if reveal {
            path.parent().unwrap_or(path)
        } else {
            path
        };
        Command::new("xdg-open").arg(target).status()
    };

    match status {
        Ok(exit_status) if exit_status.success() => Ok(()),
        Ok(exit_status) => Err(AppError::OpenPathFailed(format!(
            "system opener exited with status: {exit_status}"
        ))),
        Err(error) => Err(AppError::OpenPathFailed(error.to_string())),
    }
}

pub fn convert_with_pandoc(request: ConvertRequest, format: &str) -> ApiResponse<ConvertData> {
    let job_id = Uuid::new_v4().to_string();
    let input_path = match normalize_path(&request.input_path, "input_path") {
        Ok(path) => path,
        Err(error) => return err(error),
    };
    let output_path = match normalize_path(&request.output_path, "output_path") {
        Ok(path) => path,
        Err(error) => return err(error),
    };
    let template_path = match normalize_template(request.template_path.clone()) {
        Ok(path) => path,
        Err(error) => return err(error),
    };

    let normalized_request = ConvertRequest {
        input_path: input_path.display().to_string(),
        output_path: output_path.display().to_string(),
        template_path: template_path
            .as_ref()
            .map(|path| path.display().to_string()),
    };

    if let Err(error) = ensure_input_path(&input_path) {
        let _ = append_history(history_record(
            &job_id,
            &normalized_request,
            format,
            "failed",
            Some(&error),
        ));
        return err(error);
    }

    if let Err(error) = ensure_output_path(&output_path, format) {
        let _ = append_history(history_record(
            &job_id,
            &normalized_request,
            format,
            "failed",
            Some(&error),
        ));
        return err(error);
    }

    match run_pandoc(&input_path, &output_path, template_path.as_deref()) {
        Ok(()) => {
            let _ = append_history(history_record(
                &job_id,
                &normalized_request,
                format,
                "success",
                None,
            ));
            ok(ConvertData {
                job_id,
                output_path: normalized_request.output_path,
                format: format.to_string(),
                template_path: normalized_request.template_path,
            })
        }
        Err(error) => {
            let _ = append_history(history_record(
                &job_id,
                &normalized_request,
                format,
                "failed",
                Some(&error),
            ));
            err(error)
        }
    }
}

#[tauri::command]
pub fn health_check() -> ApiResponse<HealthData> {
    ok(HealthData {
        app_name: "FileChif".to_string(),
        version: "0.1.0".to_string(),
        status: "ok".to_string(),
    })
}

#[tauri::command]
pub fn get_app_status() -> ApiResponse<AppStatusData> {
    ok(AppStatusData {
        app_name: "FileChif".to_string(),
        app_version: "0.1.0".to_string(),
        build_time: env!("FILECHIF_BUILD_TIME").to_string(),
        release_channel: env!("FILECHIF_RELEASE_CHANNEL").to_string(),
        data_dir: project_data_dir().display().to_string(),
        history_path: history_path().display().to_string(),
        templates_path: templates_path().display().to_string(),
        dependencies: vec![command_version("pandoc"), command_version("typst")],
        release_info: ReleaseInfo {
            repository_url: "https://github.com/fomoesc-git/FileChif".to_string(),
            release_notes_url:
                "https://github.com/fomoesc-git/FileChif/blob/main/docs/RELEASE_NOTES.md"
                    .to_string(),
            internal_install_url:
                "https://github.com/fomoesc-git/FileChif/blob/main/docs/INTERNAL_INSTALL.md"
                    .to_string(),
            update_policy:
                "内部 preview 版暂不自动更新；从 GitHub Actions 或 releases 目录获取新版安装包。"
                    .to_string(),
        },
        about: AboutData {
            tagline: "把 Markdown 快速整理成交付文档。".to_string(),
            description:
                "FileChif 是面向个人与小团队的桌面文档工作台，聚焦 Markdown 到 DOCX/PDF 的稳定转换、模板复用和本地历史留存。"
                    .to_string(),
            maintainer: "fomoesc-git / studio internal preview".to_string(),
            license: "Open source preview; license to be confirmed before public release."
                .to_string(),
        },
    })
}

#[tauri::command]
pub fn convert_markdown_to_docx(request: ConvertRequest) -> ApiResponse<ConvertData> {
    convert_with_pandoc(request, "docx")
}

#[tauri::command]
pub fn convert_markdown_to_pdf(request: ConvertRequest) -> ApiResponse<ConvertData> {
    convert_with_pandoc(request, "pdf")
}

#[tauri::command]
pub fn list_history() -> ApiResponse<Value> {
    let existing = fs::read_to_string(history_path()).unwrap_or_else(|_| "[]".to_string());
    match serde_json::from_str::<Value>(&existing) {
        Ok(value) => ok(value),
        Err(e) => err(AppError::Internal(e.to_string())),
    }
}

#[tauri::command]
pub fn open_output_file(path: String) -> ApiResponse<()> {
    match normalize_path(&path, "path").and_then(|normalized| open_with_system(&normalized, false)) {
        Ok(()) => ok(()),
        Err(error) => err(error),
    }
}

#[tauri::command]
pub fn reveal_output_file(path: String) -> ApiResponse<()> {
    match normalize_path(&path, "path").and_then(|normalized| open_with_system(&normalized, true)) {
        Ok(()) => ok(()),
        Err(error) => err(error),
    }
}

#[tauri::command]
pub fn open_url(url: String) -> ApiResponse<()> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("https://") || trimmed.starts_with("http://")) {
        return err(AppError::InvalidParam(format!(
            "url must start with http:// or https://: {trimmed}"
        )));
    }

    match open_external_target(trimmed) {
        Ok(()) => ok(()),
        Err(error) => err(error),
    }
}

fn open_external_target(target: &str) -> Result<(), AppError> {
    let status = if cfg!(target_os = "macos") {
        Command::new("open").arg(target).status()
    } else if cfg!(target_os = "windows") {
        Command::new("explorer").arg(target).status()
    } else {
        Command::new("xdg-open").arg(target).status()
    };

    match status {
        Ok(exit_status) if exit_status.success() => Ok(()),
        Ok(exit_status) => Err(AppError::OpenPathFailed(format!(
            "system opener exited with status: {exit_status}"
        ))),
        Err(error) => Err(AppError::OpenPathFailed(error.to_string())),
    }
}

#[tauri::command]
pub fn list_templates() -> ApiResponse<Vec<TemplateRecord>> {
    match read_templates() {
        Ok(records) => ok(records),
        Err(error) => err(error),
    }
}

#[tauri::command]
pub fn add_template(path: String, name: Option<String>) -> ApiResponse<TemplateRecord> {
    let normalized = match normalize_path(&path, "path") {
        Ok(path) => path,
        Err(error) => return err(error),
    };

    if !normalized.exists() {
        return err(AppError::TemplateNotFound(normalized.display().to_string()));
    }
    if !normalized.is_file() {
        return err(AppError::InvalidParam(format!(
            "template path must be a file: {}",
            normalized.display()
        )));
    }
    if extension_lowercase(&normalized) != "docx" {
        return err(AppError::InvalidParam(
            "template file must use .docx extension".to_string(),
        ));
    }

    let mut records = match read_templates() {
        Ok(records) => records,
        Err(error) => return err(error),
    };
    let normalized_path = normalized.display().to_string();

    if let Some(existing) = records.iter().find(|record| record.path == normalized_path) {
        return ok(TemplateRecord {
            template_id: existing.template_id.clone(),
            name: existing.name.clone(),
            path: existing.path.clone(),
            created_at: existing.created_at.clone(),
        });
    }

    let template_name = name
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| {
            normalized
                .file_stem()
                .and_then(OsStr::to_str)
                .unwrap_or("Untitled Template")
                .to_string()
        });

    let record = TemplateRecord {
        template_id: Uuid::new_v4().to_string(),
        name: template_name,
        path: normalized_path,
        created_at: Utc::now().to_rfc3339(),
    };
    records.push(TemplateRecord {
        template_id: record.template_id.clone(),
        name: record.name.clone(),
        path: record.path.clone(),
        created_at: record.created_at.clone(),
    });

    match write_templates(&records) {
        Ok(()) => ok(record),
        Err(error) => err(error),
    }
}

#[tauri::command]
pub fn remove_template(template_id: String) -> ApiResponse<()> {
    let mut records = match read_templates() {
        Ok(records) => records,
        Err(error) => return err(error),
    };
    let initial_len = records.len();
    records.retain(|record| record.template_id != template_id);

    if records.len() == initial_len {
        return err(AppError::InvalidParam(format!(
            "template not found: {template_id}"
        )));
    }

    match write_templates(&records) {
        Ok(()) => ok(()),
        Err(error) => err(error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_input() {
        let response = convert_with_pandoc(
            ConvertRequest {
                input_path: "/tmp/filechif-missing.md".to_string(),
                output_path: "/tmp/filechif-output.docx".to_string(),
                template_path: None,
            },
            "docx",
        );

        assert!(!response.ok);
        assert_eq!(
            response.error.map(|error| error.code),
            Some("INPUT_NOT_FOUND".to_string())
        );
    }

    #[test]
    fn rejects_wrong_output_extension() {
        let input_path = std::env::temp_dir().join(format!("filechif-{}.md", Uuid::new_v4()));
        fs::write(&input_path, "# Test").expect("write test markdown");

        let response = convert_with_pandoc(
            ConvertRequest {
                input_path: input_path.display().to_string(),
                output_path: "/tmp/filechif-output.pdf".to_string(),
                template_path: None,
            },
            "docx",
        );

        let _ = fs::remove_file(input_path);

        assert!(!response.ok);
        assert_eq!(
            response.error.map(|error| error.code),
            Some("INVALID_OUTPUT_EXTENSION".to_string())
        );
    }

    #[test]
    fn handles_real_pandoc_execution_path() {
        let input_path = std::env::temp_dir().join(format!("filechif-{}.md", Uuid::new_v4()));
        let output_path = std::env::temp_dir().join(format!("filechif-{}.docx", Uuid::new_v4()));
        fs::write(&input_path, "# Test").expect("write test markdown");

        let response = convert_with_pandoc(
            ConvertRequest {
                input_path: input_path.display().to_string(),
                output_path: output_path.display().to_string(),
                template_path: None,
            },
            "docx",
        );

        let _ = fs::remove_file(input_path);

        if Command::new("pandoc").arg("--version").output().is_ok() {
            assert!(response.ok);
            assert!(output_path.exists());
            let _ = fs::remove_file(output_path);
        } else if let Some(error) = response.error {
            assert_eq!(error.code, "PANDOC_UNAVAILABLE");
        }
    }

    #[test]
    fn handles_real_pdf_execution_path() {
        let input_path = std::env::temp_dir().join(format!("filechif-{}.md", Uuid::new_v4()));
        let output_path = std::env::temp_dir().join(format!("filechif-{}.pdf", Uuid::new_v4()));
        fs::write(&input_path, "# Test\n\nPDF smoke test.").expect("write test markdown");

        let response = convert_with_pandoc(
            ConvertRequest {
                input_path: input_path.display().to_string(),
                output_path: output_path.display().to_string(),
                template_path: None,
            },
            "pdf",
        );

        let _ = fs::remove_file(input_path);

        if Command::new("pandoc").arg("--version").output().is_ok()
            && Command::new("typst").arg("--version").output().is_ok()
        {
            assert!(response.ok);
            assert!(output_path.exists());
            let _ = fs::remove_file(output_path);
        } else if let Some(error) = response.error {
            assert!(["PANDOC_UNAVAILABLE", "CONVERT_FAILED"].contains(&error.code.as_str()));
        }
    }

    #[test]
    fn manages_template_records() {
        let template_path = std::env::temp_dir().join(format!("filechif-{}.docx", Uuid::new_v4()));
        fs::write(&template_path, "template").expect("write template file");

        let added = add_template(template_path.display().to_string(), Some("Test".to_string()));
        assert!(added.ok);
        let record = added.data.expect("template data");

        let duplicate = add_template(template_path.display().to_string(), Some("Other".to_string()));
        assert!(duplicate.ok);
        assert_eq!(duplicate.data.expect("duplicate data").template_id, record.template_id);

        let listed = list_templates();
        assert!(listed.ok);
        assert!(listed
            .data
            .expect("template list")
            .iter()
            .any(|item| item.template_id == record.template_id));

        let removed = remove_template(record.template_id);
        assert!(removed.ok);

        let _ = fs::remove_file(template_path);
    }

    #[test]
    fn reports_data_paths() {
        let response = get_app_status();
        assert!(response.ok);
        let status = response.data.expect("app status");
        assert!(status.history_path.ends_with("history.json"));
        assert!(status.templates_path.ends_with("templates.json"));
    }
}
