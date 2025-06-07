#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use uuid::Uuid;
use chrono::Local;
use log::LevelFilter;
use std::sync::Arc;
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{Emitter, Manager, State, WebviewWindow};
use tokio::sync::mpsc::{unbounded_channel, UnboundedSender};
use tokio::sync::Mutex;
use tokio_tungstenite::connect_async;
use tungstenite::{Message, Utf8Bytes};
use std::fs::File;
use std::io::{BufRead, BufReader};

fn init_logger() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Generate a new session UUID
    let session_id = Uuid::new_v4();
    let filename = format!("session_{}.log", session_id);
    println!("Logging to {} …", filename);

    // 2. Configure fern:
    fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{} [{}] {}",
                Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.level(),
                message
            ))
        })
        .level(LevelFilter::Info)
        .chain(fern::log_file(filename)?)
        .chain(std::io::stdout())
        .apply()?;
    Ok(())
}
#[derive(Clone)]
struct SimSender(Arc<Mutex<UnboundedSender<String>>>);

#[derive(Debug, Serialize, Clone, Deserialize)]
struct AcData {
    id: serde_json::Value,
    lat: serde_json::Value,
    lon: serde_json::Value,
    alt: serde_json::Value,
    trk: serde_json::Value
}
#[derive(Debug, Serialize)]
struct NavPoint {
    id:   String,
    lat:  f64,
    lon:  f64,
    name: String,
}
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
                    let _ = window.emit("acdata", data);
                }
            }
            Ok(Message::Ping(_payload)) => {
            }
            Ok(Message::Close(_)) | Err(_) => break,
            _ => {}
        }
    }
}
#[tauri::command]
fn get_nav_points() -> Result<Vec<NavPoint>, String> {
    let path = "ressources/nav.dat";
    let file = File::open(path)
        .map_err(|e| format!("Could not open {}: {}", path, e))?;
    let reader = BufReader::new(file);

    let mut navs = Vec::new();
    for line in reader.lines() {
        let line = line.map_err(|e| format!("Error reading {}: {}", path, e))?;
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // The file format is (fields separated by whitespace), e.g.:
        // 2  38.08777778 -077.32491667      0   396  50    0.0 APH  A P HILL NDB
        // We want parts[1]=lat, parts[2]=lon, parts[7]=id, rest is name.
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 8 {
            // skip malformed lines
            continue;
        }
        let lat: f64 = parts[1].parse().map_err(|e| {
            format!("Invalid latitude '{}' in {}: {}", parts[1], path, e)
        })?;
        let lon: f64 = parts[2].parse().map_err(|e| {
            format!("Invalid longitude '{}' in {}: {}", parts[2], path, e)
        })?;
        let ident = parts[7].to_string();
        let name = if parts.len() > 8 {
            parts[8..].join(" ")
        } else {
            String::new()
        };

        navs.push(NavPoint {
            id:   ident,
            lat,
            lon,
            name,
        });
    }
    Ok(navs)
}
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
#[tauri::command]
async fn set_altitude(id: &str, altitude: &str, sim: State<'_, SimSender>) -> Result<(), String> {
    log::info!("User SET_ALTITUDE → id={} alt={}", id, altitude);
    let cmd = json!({
        "command": format!("ALT {} {}", id, altitude),
    }).to_string();
    sim.0.lock().await.send(cmd).map_err(|e| format!("send error: {}", e))
}
#[tauri::command]
async fn set_heading(id: &str, heading: &str, sim: State<'_, SimSender>) -> Result<(), String> {
    log::info!("User SET_HEADING → id={} hdg={}", id, heading);
    let cmd = json!({
        "command": format!("HDG {} {}", id, heading),
    }).to_string();
    sim.0.lock().await.send(cmd).map_err(|e| format!("send error: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_logger().expect("failed to initialize logger");
    log::info!("Starting Tauri application");
    let (tx, mut rx) = unbounded_channel::<String>();
    let sim_sender = SimSender(Arc::new(Mutex::new(tx)));
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(sim_sender)
        .invoke_handler(tauri::generate_handler![greet, set_altitude, set_heading, get_nav_points])
        .setup(|app| {
            // Grab a handle to the main window
            let window = app.get_webview_window("main").unwrap();
            // Spawn the async task on Tauri’s runtime
            tauri::async_runtime::spawn(spawn_ws_poller(window));
            tauri::async_runtime::spawn(async move {
                // Connect to the simulator WebSocket
                let url = "ws://127.0.0.1:3000/control";  // adjust as needed
                let (ws_stream, _) = connect_async(url)
                    .await
                    .expect("Failed to connect to simulator");
                let (mut write, mut read) = ws_stream.split();

                tokio::spawn(async move {
                    while let Some(msg) = read.next().await {
                        if let Ok(Message::Text(txt)) = msg {
                            println!("[simulator]→ {}", txt);
                        }
                    }
                });

                // Forward commands from the channel into the WS
                while let Some(cmd_str) = rx.recv().await {
                    if let Err(e) = write.send(Message::Text(Utf8Bytes::from(cmd_str))).await {
                        eprintln!("Error sending to simulator WS: {}", e);
                        break;
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
