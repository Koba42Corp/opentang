// OpenTang — Tauri backend
// M1: Bones — minimal shell, no commands wired yet.
// System detection, compose generation, and IPC commands come in M2/M3.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running OpenTang")
}
