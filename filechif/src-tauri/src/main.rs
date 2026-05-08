mod commands;
mod error;
mod models;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::health_check,
            commands::get_app_status,
            commands::convert_markdown_to_docx,
            commands::convert_markdown_to_pdf,
            commands::list_history,
            commands::open_output_file,
            commands::reveal_output_file,
            commands::open_url,
            commands::list_templates,
            commands::add_template,
            commands::remove_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
