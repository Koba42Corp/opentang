// OpenTang — Tauri backend
// M5: Full Stack — SSL, Tier 2 services, health checks, install path picker.
// M6: Package Registry — App Store, Dashboard, install state persistence.

mod commands;
use commands::system::{system_check, install_docker, scan_existing_services};
use commands::install::{generate_compose, start_install, get_service_status};
use commands::registry::{
    get_registry, install_package, remove_package, update_package,
    load_install_state, save_install_state,
};
use commands::chat::{chat_send, chat_check_gateway};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            system_check,
            install_docker,
            scan_existing_services,
            generate_compose,
            start_install,
            get_service_status,
            get_registry,
            install_package,
            remove_package,
            update_package,
            load_install_state,
            save_install_state,
            chat_send,
            chat_check_gateway,
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenTang")
}
