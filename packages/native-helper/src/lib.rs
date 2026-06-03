pub mod active_window;
pub mod input;
pub mod keyboard;

use std::sync::{Mutex, OnceLock};

static HOTKEY_RECOGNIZER: OnceLock<Mutex<keyboard::RightAltHotkeyRecognizer>> = OnceLock::new();
static KEYBOARD_HOOK: OnceLock<Mutex<Option<keyboard::HookHandle>>> = OnceLock::new();

fn keyboard_hook_slot() -> &'static Mutex<Option<keyboard::HookHandle>> {
    KEYBOARD_HOOK.get_or_init(|| Mutex::new(None))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NativeHelperError {
    UnsupportedPlatform,
    InputUnavailable(String),
}

impl std::fmt::Display for NativeHelperError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NativeHelperError::UnsupportedPlatform => {
                write!(formatter, "UNSUPPORTED_PLATFORM")
            }
            NativeHelperError::InputUnavailable(message) => {
                write!(formatter, "INPUT_UNAVAILABLE: {message}")
            }
        }
    }
}

impl std::error::Error for NativeHelperError {}

pub type NativeHelperResult<T> = Result<T, NativeHelperError>;

pub fn ensure_supported_platform() -> NativeHelperResult<()> {
    if cfg!(windows) {
        Ok(())
    } else {
        Err(NativeHelperError::UnsupportedPlatform)
    }
}

pub fn recognize_right_alt_hotkey_event(
    key_code: u32,
    transition: keyboard::KeyTransition,
) -> Option<keyboard::HotkeyAction> {
    let recognizer = HOTKEY_RECOGNIZER.get_or_init(|| {
        Mutex::new(keyboard::RightAltHotkeyRecognizer::new())
    });
    let mut recognizer = recognizer.lock().ok()?;

    recognizer.handle_event(keyboard::KeyEvent {
        key_code,
        transition,
    })
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn paste_from_clipboard() -> napi::Result<()> {
    input::paste_from_clipboard().map_err(to_napi_error)
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn copy_selection_to_clipboard() -> napi::Result<()> {
    input::copy_selection_to_clipboard().map_err(to_napi_error)
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn type_text(text: String) -> napi::Result<()> {
    input::type_text(&text).map_err(to_napi_error)
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn get_foreground_window_handle() -> napi::Result<Option<String>> {
    active_window::get_foreground_window_handle().map_err(to_napi_error)
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn focus_window(window_handle: String) -> napi::Result<()> {
    active_window::focus_window(&window_handle).map_err(to_napi_error)
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn recognize_right_alt_hotkey(key_code: u32, transition: String) -> Option<String> {
    let transition = match transition.as_str() {
        "down" => keyboard::KeyTransition::Down,
        "up" => keyboard::KeyTransition::Up,
        _ => return None,
    };
    let action = recognize_right_alt_hotkey_event(key_code, transition)?;

    Some(match action {
        keyboard::HotkeyAction::ToggleDirect => "direct".to_string(),
        keyboard::HotkeyAction::ProcessSelection => "processSelection".to_string(),
        keyboard::HotkeyAction::TranslateDictation => "translate".to_string(),
        keyboard::HotkeyAction::ShortcutHelp => "shortcutHelp".to_string(),
        keyboard::HotkeyAction::ShortcutHelpDismiss => "shortcutHelpDismiss".to_string(),
    })
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn configure_keyboard_shortcuts(
    direct: String,
    process_selection: String,
    translate: String,
) -> napi::Result<()> {
    keyboard::configure_hook_shortcuts(&direct, &process_selection, &translate)
        .map_err(to_napi_error)
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn start_keyboard_hook(
    callback: napi::threadsafe_function::ThreadsafeFunction<
        String,
        napi::threadsafe_function::ErrorStrategy::Fatal,
    >,
) -> napi::Result<()> {
    use napi::threadsafe_function::ThreadsafeFunctionCallMode;

    eprintln!("[rust-hook] start_keyboard_hook：被调用");
    let mut slot = keyboard_hook_slot()
        .lock()
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    if slot.is_some() {
        eprintln!("[rust-hook] start_keyboard_hook：hook 已安装过");
        return Err(napi::Error::from_reason(
            "HOOK_ALREADY_INSTALLED".to_string(),
        ));
    }

    let handle = keyboard::install_hook(move |action| {
        let payload = match action {
            keyboard::HotkeyAction::ToggleDirect => "direct".to_string(),
            keyboard::HotkeyAction::ProcessSelection => "processSelection".to_string(),
            keyboard::HotkeyAction::TranslateDictation => "translate".to_string(),
            keyboard::HotkeyAction::ShortcutHelp => "shortcutHelp".to_string(),
            keyboard::HotkeyAction::ShortcutHelpDismiss => "shortcutHelpDismiss".to_string(),
        };
        eprintln!("[rust-hook] 分发 action 给 JS 线程：{}", payload);
        callback.call(payload, ThreadsafeFunctionCallMode::NonBlocking);
    })
    .map_err(|error| {
        eprintln!("[rust-hook] install_hook 失败：{error}");
        to_napi_error(error)
    })?;

    eprintln!("[rust-hook] start_keyboard_hook：安装完成");
    *slot = Some(handle);
    Ok(())
}

#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn stop_keyboard_hook() -> napi::Result<()> {
    eprintln!("[rust-hook] stop_keyboard_hook：被调用");
    let mut slot = keyboard_hook_slot()
        .lock()
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    if let Some(handle) = slot.take() {
        keyboard::uninstall_hook(handle).map_err(|error| {
            eprintln!("[rust-hook] uninstall_hook 失败：{error}");
            to_napi_error(error)
        })?;
        eprintln!("[rust-hook] stop_keyboard_hook：已卸载");
    } else {
        eprintln!("[rust-hook] stop_keyboard_hook：无 handle，跳过");
    }
    Ok(())
}

#[cfg(feature = "node-addon")]
fn to_napi_error(error: NativeHelperError) -> napi::Error {
    napi::Error::from_reason(error.to_string())
}

/// 让 Node 日志可以和 Rust eprintln! 共享相同的 Windows console 输出通道。
/// Windows 下通过 WriteConsoleW 直接写 UTF-16 到 STD_ERROR_HANDLE，不受代码页影响；
/// 若 handle 不是真实 console（被重定向成 pipe/file），则退回字节写入。
#[cfg(feature = "node-addon")]
#[napi_derive::napi]
pub fn write_log_line(text: String) {
    write_log_impl(&text);
}

#[cfg(all(windows, feature = "node-addon"))]
fn write_log_impl(text: &str) {
    use windows::Win32::System::Console::{
        GetConsoleMode, GetStdHandle, WriteConsoleW, CONSOLE_MODE, STD_ERROR_HANDLE,
    };
    unsafe {
        let handle = match GetStdHandle(STD_ERROR_HANDLE) {
            Ok(h) => h,
            Err(_) => {
                eprint!("{}", text);
                return;
            }
        };
        let mut mode = CONSOLE_MODE(0);
        if GetConsoleMode(handle, &mut mode).is_err() {
            eprint!("{}", text);
            return;
        }
        let wide: Vec<u16> = text.encode_utf16().collect();
        if wide.is_empty() {
            return;
        }
        let mut written: u32 = 0;
        if WriteConsoleW(handle, &wide, Some(&mut written as *mut u32), None).is_err() {
            eprint!("{}", text);
        }
    }
}

#[cfg(all(not(windows), feature = "node-addon"))]
fn write_log_impl(text: &str) {
    eprint!("{}", text);
}

#[cfg(test)]
mod tests {
    use super::{
        ensure_supported_platform, keyboard, recognize_right_alt_hotkey_event,
        NativeHelperError, HOTKEY_RECOGNIZER,
    };

    fn reset_hotkey_recognizer() {
        if let Some(recognizer) = HOTKEY_RECOGNIZER.get() {
            *recognizer.lock().expect("hotkey recognizer lock") =
                keyboard::RightAltHotkeyRecognizer::new();
        }
    }

    #[test]
    fn reports_non_windows_as_unsupported() {
        if !cfg!(windows) {
            assert_eq!(
                ensure_supported_platform(),
                Err(NativeHelperError::UnsupportedPlatform)
            );
        }
    }

    #[test]
    fn exported_hotkey_recognizer_keeps_state_across_calls() {
        reset_hotkey_recognizer();

        assert_eq!(
            recognize_right_alt_hotkey_event(
                keyboard::RIGHT_ALT_KEY_CODE,
                keyboard::KeyTransition::Down
            ),
            None
        );
        assert_eq!(
            recognize_right_alt_hotkey_event(
                keyboard::SPACE_KEY_CODE,
                keyboard::KeyTransition::Down
            ),
            None
        );
        assert_eq!(
            recognize_right_alt_hotkey_event(
                keyboard::SPACE_KEY_CODE,
                keyboard::KeyTransition::Up
            ),
            Some(keyboard::HotkeyAction::ProcessSelection)
        );
    }
}
