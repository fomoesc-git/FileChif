use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("invalid parameter: {0}")]
    InvalidParam(String),
    #[error("input not found: {0}")]
    InputNotFound(String),
    #[error("invalid input extension: {0}")]
    InvalidInputExtension(String),
    #[error("output path extension must be .{expected}, got: {actual}")]
    InvalidOutputExtension { expected: String, actual: String },
    #[error("output directory is not writable: {0}")]
    OutputDirNotWritable(String),
    #[error("template not found: {0}")]
    TemplateNotFound(String),
    #[error("pandoc command failed: {0}")]
    ConvertFailed(String),
    #[error("pandoc is not available: {0}")]
    PandocUnavailable(String),
    #[error("open path failed: {0}")]
    OpenPathFailed(String),
    #[error("internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::InvalidParam(_) => "INVALID_PARAM",
            AppError::InputNotFound(_) => "INPUT_NOT_FOUND",
            AppError::InvalidInputExtension(_) => "INVALID_INPUT_EXTENSION",
            AppError::InvalidOutputExtension { .. } => "INVALID_OUTPUT_EXTENSION",
            AppError::OutputDirNotWritable(_) => "OUTPUT_DIR_NOT_WRITABLE",
            AppError::TemplateNotFound(_) => "TEMPLATE_NOT_FOUND",
            AppError::ConvertFailed(_) => "CONVERT_FAILED",
            AppError::PandocUnavailable(_) => "PANDOC_UNAVAILABLE",
            AppError::OpenPathFailed(_) => "OPEN_PATH_FAILED",
            AppError::Internal(_) => "INTERNAL_ERROR",
        }
    }
}
