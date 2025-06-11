// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager, Window};
use tokio::process::Command as TokioCommand;

#[derive(Debug, Serialize, Deserialize)]
struct CaptureRegion {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct VoiceSettings {
    gender: String,
    speed: f64,
    pitch: f64,
    language: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct TranslationRequest {
    text: String,
    from: String,
    to: String,
}

// Screen capture command
#[command]
async fn capture_screen(region: CaptureRegion) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("screencapture")
            .args(&[
                "-R",
                &format!("{},{},{},{}", region.x, region.y, region.width, region.height),
                "-t",
                "png",
                "/tmp/babelink_capture.png"
            ])
            .output()
            .map_err(|e| format!("Failed to execute screencapture: {}", e))?;

        if !output.status.success() {
            return Err(format!("screencapture failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        // Read the captured image and convert to base64
        let image_data = std::fs::read("/tmp/babelink_capture.png")
            .map_err(|e| format!("Failed to read captured image: {}", e))?;
        
        let base64_image = base64::encode(&image_data);
        Ok(base64_image)
    }

    #[cfg(target_os = "windows")]
    {
        // Windows implementation using PowerShell
        let script = format!(
            r#"
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            
            $bounds = [System.Drawing.Rectangle]::new({}, {}, {}, {})
            $bmp = [System.Drawing.Bitmap]::new($bounds.width, $bounds.height)
            $graphics = [System.Drawing.Graphics]::FromImage($bmp)
            $graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.size)
            
            $bmp.Save('C:\temp\babelink_capture.png', [System.Drawing.Imaging.ImageFormat]::Png)
            $graphics.Dispose()
            $bmp.Dispose()
            "#,
            region.x, region.y, region.width, region.height
        );

        let output = Command::new("powershell")
            .args(&["-Command", &script])
            .output()
            .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;

        if !output.status.success() {
            return Err(format!("PowerShell failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let image_data = std::fs::read("C:\\temp\\babelink_capture.png")
            .map_err(|e| format!("Failed to read captured image: {}", e))?;
        
        let base64_image = base64::encode(&image_data);
        Ok(base64_image)
    }

    #[cfg(target_os = "linux")]
    {
        // Linux implementation using gnome-screenshot or scrot
        let output = Command::new("gnome-screenshot")
            .args(&[
                "--area",
                &format!("{}x{}+{}+{}", region.width, region.height, region.x, region.y),
                "--file=/tmp/babelink_capture.png"
            ])
            .output()
            .or_else(|_| {
                // Fallback to scrot
                Command::new("scrot")
                    .args(&[
                        "-a",
                        &format!("{},{},{},{}", region.x, region.y, region.width, region.height),
                        "/tmp/babelink_capture.png"
                    ])
                    .output()
            })
            .map_err(|e| format!("Failed to capture screen: {}", e))?;

        if !output.status.success() {
            return Err(format!("Screen capture failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let image_data = std::fs::read("/tmp/babelink_capture.png")
            .map_err(|e| format!("Failed to read captured image: {}", e))?;
        
        let base64_image = base64::encode(&image_data);
        Ok(base64_image)
    }
}

// OCR text extraction command
#[command]
async fn extract_text(image_base64: String) -> Result<String, String> {
    // Decode base64 image
    let image_data = base64::decode(&image_base64)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    // Save to temporary file
    let temp_path = "/tmp/babelink_ocr.png";
    std::fs::write(temp_path, &image_data)
        .map_err(|e| format!("Failed to write temp image: {}", e))?;

    // Use tesseract for OCR
    let output = TokioCommand::new("tesseract")
        .args(&[temp_path, "stdout", "-l", "eng+por+spa+fra+deu+ita+rus+jpn+kor+chi_sim+chi_tra+ara"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute tesseract: {}", e))?;

    if !output.status.success() {
        return Err(format!("Tesseract failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let extracted_text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    
    // Clean up temp file
    let _ = std::fs::remove_file(temp_path);
    
    Ok(extracted_text)
}

// Translation command (calls IBM Watson API)
#[command]
async fn translate_text(request: TranslationRequest) -> Result<String, String> {
    // This would typically make an HTTP request to IBM Watson
    // For now, we'll return a placeholder
    let client = reqwest::Client::new();
    
    let api_key = std::env::var("IBM_WATSON_API_KEY")
        .map_err(|_| "IBM Watson API key not found in environment")?;
    
    let url = std::env::var("IBM_WATSON_URL")
        .unwrap_or_else(|_| "https://api.us-south.language-translator.watson.cloud.ibm.com".to_string());

    let mut body = HashMap::new();
    body.insert("text", vec![request.text]);
    body.insert("source", vec![request.from]);
    body.insert("target", vec![request.to]);

    let response = client
        .post(&format!("{}/v3/translate?version=2018-05-01", url))
        .header("Authorization", format!("Basic {}", base64::encode(&format!("apikey:{}", api_key))))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to call translation API: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Translation API error: {}", response.status()));
    }

    let result: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse translation response: {}", e))?;

    let translated_text = result["translations"][0]["translation"]
        .as_str()
        .unwrap_or("Translation failed")
        .to_string();

    Ok(translated_text)
}

// Text-to-speech command
#[command]
async fn speak_text(text: String, settings: VoiceSettings) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let voice = match settings.gender.as_str() {
            "male" => "Alex",
            "female" => "Samantha",
            _ => "Samantha",
        };

        let rate = (settings.speed * 200.0) as i32; // Convert to words per minute

        let output = Command::new("say")
            .args(&[
                "-v", voice,
                "-r", &rate.to_string(),
                &text
            ])
            .output()
            .map_err(|e| format!("Failed to execute say command: {}", e))?;

        if !output.status.success() {
            return Err(format!("TTS failed: {}", String::from_utf8_lossy(&output.stderr)));
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Windows SAPI implementation
        let script = format!(
            r#"
            Add-Type -AssemblyName System.Speech
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
            $synth.Rate = {}
            $synth.Volume = 100
            $synth.Speak('{}')
            "#,
            (settings.speed * 5.0) as i32 - 5, // Convert to SAPI rate (-10 to 10)
            text.replace("'", "''") // Escape single quotes
        );

        let output = Command::new("powershell")
            .args(&["-Command", &script])
            .output()
            .map_err(|e| format!("Failed to execute PowerShell TTS: {}", e))?;

        if !output.status.success() {
            return Err(format!("TTS failed: {}", String::from_utf8_lossy(&output.stderr)));
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Linux implementation using espeak
        let rate = (settings.speed * 175.0) as i32; // Convert to words per minute

        let output = Command::new("espeak")
            .args(&[
                "-s", &rate.to_string(),
                "-v", &format!("{}+{}", settings.language, if settings.gender == "male" { "m" } else { "f" }),
                &text
            ])
            .output()
            .map_err(|e| format!("Failed to execute espeak: {}", e))?;

        if !output.status.success() {
            return Err(format!("TTS failed: {}", String::from_utf8_lossy(&output.stderr)));
        }
    }

    Ok(())
}

// Check permissions
#[command]
async fn check_permissions() -> Result<HashMap<String, bool>, String> {
    let mut permissions = HashMap::new();
    
    // Check screen recording permission (macOS)
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("sqlite3")
            .args(&[
                "/Library/Application Support/com.apple.TCC/TCC.db",
                "SELECT allowed FROM access WHERE service='kTCCServiceScreenCapture' AND client='com.babelink.app';"
            ])
            .output();
        
        permissions.insert("screen_capture".to_string(), 
            output.map_or(false, |o| String::from_utf8_lossy(&o.stdout).trim() == "1"));
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        permissions.insert("screen_capture".to_string(), true);
    }
    
    // Check microphone permission (for future voice input)
    permissions.insert("microphone".to_string(), true);
    
    Ok(permissions)
}

// Get system info
#[command]
async fn get_system_info() -> Result<HashMap<String, String>, String> {
    let mut info = HashMap::new();
    
    info.insert("platform".to_string(), std::env::consts::OS.to_string());
    info.insert("arch".to_string(), std::env::consts::ARCH.to_string());
    
    // Get display info
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("system_profiler")
            .arg("SPDisplaysDataType")
            .output()
            .map_err(|e| format!("Failed to get display info: {}", e))?;
        
        info.insert("display_info".to_string(), String::from_utf8_lossy(&output.stdout).to_string());
    }
    
    Ok(info)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            capture_screen,
            extract_text,
            translate_text,
            speak_text,
            check_permissions,
            get_system_info
        ])
        .setup(|app| {
            // Initialize the app
            println!("Babelink Desktop starting...");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}