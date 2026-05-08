use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub ok: bool,
    pub data: Option<T>,
    pub error: Option<ApiError>,
    pub trace_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthData {
    pub app_name: String,
    pub version: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConvertData {
    pub job_id: String,
    pub output_path: String,
    pub format: String,
    pub template_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConvertRequest {
    pub input_path: String,
    pub output_path: String,
    pub template_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryRecord {
    pub record_id: String,
    pub job_id: String,
    pub input_path: String,
    pub output_path: String,
    pub template_path: Option<String>,
    pub format: String,
    pub status: String,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateRecord {
    pub template_id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyStatus {
    pub name: String,
    pub available: bool,
    pub version: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReleaseInfo {
    pub repository_url: String,
    pub release_notes_url: String,
    pub internal_install_url: String,
    pub update_policy: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppStatusData {
    pub app_name: String,
    pub app_version: String,
    pub build_time: String,
    pub release_channel: String,
    pub data_dir: String,
    pub history_path: String,
    pub templates_path: String,
    pub dependencies: Vec<DependencyStatus>,
    pub release_info: ReleaseInfo,
}
