#![cfg(windows)]

use std::sync::mpsc::{self, Sender};
use std::sync::{Mutex, OnceLock};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use windows::core::PCWSTR;
use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
    TranslateMessage, UnhookWindowsHookEx, HC_ACTION, HHOOK, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL,
    WM_KEYDOWN, WM_KEYUP, WM_QUIT, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

use super::{HotkeyAction, KeyEvent, KeyTransition, RightAltHotkeyRecognizer};

const SHORTCUT_HELP_HOLD_MS: u64 = 520;

/// Shared state accessed from both the hook thread and the installer thread.
///
/// `low_level_proc` is a plain C callback that the OS invokes on the hook
/// thread. It can only reach the state through this global handle because the
/// Windows API does not allow attaching a user pointer to the hook.
struct HookState {
    recognizer: RightAltHotkeyRecognizer,
    action_tx: Option<Sender<HotkeyAction>>,
}

static HOOK_STATE: OnceLock<Mutex<HookState>> = OnceLock::new();

fn hook_state() -> &'static Mutex<HookState> {
    HOOK_STATE.get_or_init(|| {
        Mutex::new(HookState {
            recognizer: RightAltHotkeyRecognizer::new(),
            action_tx: None,
        })
    })
}

pub struct WindowsHookHandle {
    hook_thread_id: u32,
    hook_thread: Option<JoinHandle<()>>,
    pump_thread: Option<JoinHandle<()>>,
}

/// Install the WH_KEYBOARD_LL hook on a dedicated OS thread.
///
/// The hook thread runs a Windows message loop. A second "pump" thread
/// drains actions from the hook and forwards them to `on_action` without
/// blocking the hook thread (keeping the hook thread responsive is critical,
/// otherwise the OS will disable the hook).
pub fn install<F>(on_action: F) -> Result<WindowsHookHandle, String>
where
    F: Fn(HotkeyAction) + Send + 'static,
{
    {
        let mut guard = hook_state().lock().map_err(|e| e.to_string())?;
        if guard.action_tx.is_some() {
            return Err("keyboard hook already installed".into());
        }
        guard.action_tx = None;
    }

    let (action_tx, action_rx) = mpsc::channel::<HotkeyAction>();
    let (install_tx, install_rx) = mpsc::channel::<Result<u32, String>>();

    {
        let mut guard = hook_state().lock().map_err(|e| e.to_string())?;
        guard.action_tx = Some(action_tx);
    }

    let hook_thread = thread::spawn(move || {
        let install_result = unsafe { install_hook_in_current_thread() };

        let hook = match install_result {
            Ok(hook) => {
                let _ = install_tx.send(Ok(unsafe { GetCurrentThreadId() }));
                hook
            }
            Err(e) => {
                let _ = install_tx.send(Err(e));
                return;
            }
        };

        unsafe {
            run_message_loop();
            let _ = UnhookWindowsHookEx(hook);
        }
    });

    let thread_id = match install_rx.recv() {
        Ok(result) => match result {
            Ok(id) => id,
            Err(e) => {
                clear_sender();
                let _ = hook_thread.join();
                return Err(e);
            }
        },
        Err(e) => {
            clear_sender();
            return Err(e.to_string());
        }
    };

    let pump_thread = thread::spawn(move || {
        eprintln!("[rust-hook] pump 线程已启动");
        while let Ok(action) = action_rx.recv() {
            eprintln!("[rust-hook] pump 线程转发 action={:?}", action);
            on_action(action);
        }
        eprintln!("[rust-hook] pump 线程退出");
    });

    Ok(WindowsHookHandle {
        hook_thread_id: thread_id,
        hook_thread: Some(hook_thread),
        pump_thread: Some(pump_thread),
    })
}

pub fn configure_shortcuts(
    direct: &str,
    process_selection: &str,
    translate: &str,
) -> Result<(), String> {
    let mut guard = hook_state().lock().map_err(|e| e.to_string())?;
    guard
        .recognizer
        .configure_shortcuts(direct, process_selection, translate)
}

pub fn uninstall(mut handle: WindowsHookHandle) -> Result<(), String> {
    unsafe {
        // WM_QUIT breaks the message loop on the hook thread.
        PostThreadMessageW(handle.hook_thread_id, WM_QUIT, WPARAM(0), LPARAM(0))
            .map_err(|e| e.to_string())?;
    }

    if let Some(join) = handle.hook_thread.take() {
        let _ = join.join();
    }

    // Dropping the sender causes the pump thread to exit recv().
    clear_sender();

    if let Some(join) = handle.pump_thread.take() {
        let _ = join.join();
    }

    Ok(())
}

fn clear_sender() {
    if let Ok(mut guard) = hook_state().lock() {
        guard.action_tx = None;
    }
}

unsafe fn install_hook_in_current_thread() -> Result<HHOOK, String> {
    let module = GetModuleHandleW(PCWSTR::null()).map_err(|e| e.to_string())?;
    let hinstance: HINSTANCE = module.into();

    let hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(low_level_proc), hinstance, 0)
        .map_err(|e| format!("SetWindowsHookExW failed: {e}"))?;
    eprintln!("[rust-hook] SetWindowsHookExW 成功（WH_KEYBOARD_LL 已安装）");
    Ok(hook)
}

unsafe fn run_message_loop() {
    let mut msg = MSG::default();
    while GetMessageW(&mut msg, None, 0, 0).as_bool() {
        let _ = TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
}

/// The low-level keyboard hook callback. Runs on the hook thread. It must
/// never call back into the OS and must not block — it simply feeds the
/// recognizer and, on a recognized action, forwards it to the pump thread
/// through an mpsc channel.
///
/// Recognized Right ALT hotkey events return a non-zero result so the
/// foreground app does not receive the same shortcut. Unrecognized keys still
/// continue through the hook chain normally.
unsafe extern "system" fn low_level_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    let mut suppress_event = false;

    if code == HC_ACTION as i32 {
        let info = &*(lparam.0 as *const KBDLLHOOKSTRUCT);

        let transition = match wparam.0 as u32 {
            WM_KEYDOWN | WM_SYSKEYDOWN => Some(KeyTransition::Down),
            WM_KEYUP | WM_SYSKEYUP => Some(KeyTransition::Up),
            _ => None,
        };

        if let Some(transition) = transition {
            let mut should_schedule_shortcut_help = false;
            let mut shortcut_help_generation = 0;

            if let Ok(mut guard) = hook_state().lock() {
                let previous_generation = guard.recognizer.pending_generation();
                let result = guard.recognizer.handle_hook_event(KeyEvent {
                    key_code: info.vkCode,
                    transition,
                });
                suppress_event = result.suppress;
                let next_generation = guard.recognizer.pending_generation();
                if transition == KeyTransition::Down
                    && next_generation.is_some()
                    && next_generation != previous_generation
                {
                    shortcut_help_generation = next_generation.expect("checked is_some");
                    should_schedule_shortcut_help = true;
                }

                if let Some(action) = result.action {
                    eprintln!(
                        "[rust-hook] 识别器产出 action={:?} vk=0x{:02X}",
                        action, info.vkCode
                    );
                    if let Some(tx) = &guard.action_tx {
                        if let Err(err) = tx.send(action) {
                            eprintln!("[rust-hook] action_tx 发送失败：{err}");
                        }
                    } else {
                        eprintln!("[rust-hook] action_tx 缺失，丢弃 action");
                    }
                }
            }

            if should_schedule_shortcut_help {
                thread::spawn(move || {
                    thread::sleep(Duration::from_millis(SHORTCUT_HELP_HOLD_MS));
                    let (action, tx) = match hook_state().lock() {
                        Ok(mut guard) => {
                            let is_current_press = guard.recognizer.pending_generation()
                                == Some(shortcut_help_generation);
                            let action = if is_current_press {
                                guard.recognizer.emit_shortcut_help_if_waiting()
                            } else {
                                None
                            };
                            (action, guard.action_tx.clone())
                        }
                        Err(_) => (None, None),
                    };

                    if let (Some(action), Some(tx)) = (action, tx) {
                        let _ = tx.send(action);
                    }
                });
            }
        }
    }

    if suppress_event {
        return LRESULT(1);
    }

    CallNextHookEx(HHOOK::default(), code, wparam, lparam)
}
