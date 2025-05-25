// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, WebviewWindow};
use tokio_tungstenite::connect_async;
use tungstenite::Message;

#[derive(Debug, Serialize, Clone, Deserialize)]
struct AcData {
    id: serde_json::Value,
    lat: serde_json::Value,
    lon: serde_json::Value,
    alt: serde_json::Value,
    trk: serde_json::Value
}

// A utility to drive your WebSocket -> Tauri→JS pipeline
async fn spawn_ws_poller(window: WebviewWindow) {
    let url = url::Url::parse("ws://127.0.0.1:3000/ws").unwrap();
    let (ws_stream, _) = connect_async(url.as_str())
        .await
        .expect("Failed to connect");
    let (_write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(txt)) => {
                if let Ok(data) = serde_json::from_str::<Vec<AcData>>(&txt) {
                    // Emit an event named "acdata" to all listeners in the front-end
                    //println!("🔴 [Rust] got acdata: {:?}", data);
                    println!("🔴 [Rust] got {} points", data.len());
                    let _ = window.emit("acdata", data);
                }
            }
            Ok(Message::Ping(_payload)) => {
                // ignore or respond if you keep a write handle
            }
            Ok(Message::Close(_)) | Err(_) => break,
            _ => {}
        }
    }
}
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_log::Builder::new().level(log::LevelFilter::Info).build())
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            // Grab a handle to the main window
            let window = app.get_webview_window("main").unwrap();
            // Spawn the async task on Tauri’s runtime
            tauri::async_runtime::spawn(spawn_ws_poller(window));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
