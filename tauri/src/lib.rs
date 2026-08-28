use std::sync::Mutex;
use tauri::{Emitter, Manager};

#[cfg(desktop)]
use tauri_plugin_deep_link::DeepLinkExt;

#[derive(Default)]
struct PendingDeepLinks(Mutex<Vec<String>>);

#[tauri::command]
fn consume_pending_deep_links(state: tauri::State<'_, PendingDeepLinks>) -> Vec<String> {
    state
        .0
        .lock()
        .map(|mut links| std::mem::take(&mut *links))
        .unwrap_or_default()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(PendingDeepLinks::default())
        .invoke_handler(tauri::generate_handler![consume_pending_deep_links])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        if url.scheme() != "hevai"
                            || url.host_str() != Some("auth")
                            || url.path() != "/callback"
                        {
                            continue;
                        }
                        let value = url.to_string();
                        if let Ok(mut links) = handle.state::<PendingDeepLinks>().0.lock() {
                            links.push(value.clone());
                        }
                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = window.emit("deep-link", serde_json::json!({ "url": value }));
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
