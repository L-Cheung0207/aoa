#![cfg(target_os = "macos")]

use std::ffi::c_void;
use std::ptr;
use std::sync::mpsc::{self, Sender};
use std::sync::{Mutex, OnceLock};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use super::{
    HotkeyAction, KeyEvent, KeyTransition, RightAltHotkeyRecognizer, RIGHT_ALT_KEY_CODE,
    RIGHT_SHIFT_KEY_CODE, SPACE_KEY_CODE,
};

type CFAllocatorRef = *const c_void;
type CFMachPortRef = *mut c_void;
type CFRunLoopRef = *mut c_void;
type CFRunLoopSourceRef = *mut c_void;
type CGEventRef = *mut c_void;
type CGEventTapProxy = *mut c_void;
type CGEventMask = u64;
type CGEventType = u32;
type CGEventTapLocation = u32;
type CGEventTapPlacement = u32;
type CGEventTapOptions = u32;
type CGKeyCode = u16;
type CGEventField = u32;

const K_CF_ALLOCATOR_DEFAULT: CFAllocatorRef = ptr::null();

const K_CG_SESSION_EVENT_TAP: CGEventTapLocation = 1;
const K_CG_HEAD_INSERT_EVENT_TAP: CGEventTapPlacement = 0;
const K_CG_EVENT_TAP_OPTION_DEFAULT: CGEventTapOptions = 0;

const K_CG_EVENT_KEY_DOWN: CGEventType = 10;
const K_CG_EVENT_KEY_UP: CGEventType = 11;
const K_CG_EVENT_FLAGS_CHANGED: CGEventType = 12;
const K_CG_EVENT_TAP_DISABLED_BY_TIMEOUT: CGEventType = 0xFFFFFFFE;
const K_CG_EVENT_TAP_DISABLED_BY_USER_INPUT: CGEventType = 0xFFFFFFFF;
const K_CG_KEYBOARD_EVENT_KEYCODE: CGEventField = 9;

const KVK_RIGHT_COMMAND: CGKeyCode = 0x36;
const KVK_RIGHT_SHIFT: CGKeyCode = 0x3C;
const KVK_SLASH: CGKeyCode = 0x2C;
const KVK_SPACE: CGKeyCode = 0x31;

const SHORTCUT_HELP_HOLD_MS: u64 = 520;

type CGEventTapCallBack =
    unsafe extern "C" fn(CGEventTapProxy, CGEventType, CGEventRef, *mut c_void) -> CGEventRef;

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn CGEventTapCreate(
        tap: CGEventTapLocation,
        place: CGEventTapPlacement,
        options: CGEventTapOptions,
        events_of_interest: CGEventMask,
        callback: CGEventTapCallBack,
        user_info: *mut c_void,
    ) -> CFMachPortRef;
    fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
    fn CGEventGetIntegerValueField(event: CGEventRef, field: CGEventField) -> i64;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    static kCFRunLoopDefaultMode: *const c_void;
    fn CFMachPortCreateRunLoopSource(
        allocator: CFAllocatorRef,
        port: CFMachPortRef,
        order: isize,
    ) -> CFRunLoopSourceRef;
    fn CFRunLoopGetCurrent() -> CFRunLoopRef;
    fn CFRunLoopAddSource(rl: CFRunLoopRef, source: CFRunLoopSourceRef, mode: *const c_void);
    fn CFRunLoopRun();
    fn CFRunLoopStop(rl: CFRunLoopRef);
    fn CFRelease(cf: *const c_void);
}

struct HookState {
    recognizer: RightAltHotkeyRecognizer,
    action_tx: Option<Sender<HotkeyAction>>,
    right_command_down: bool,
    right_shift_down: bool,
}

static HOOK_STATE: OnceLock<Mutex<HookState>> = OnceLock::new();
static RUN_LOOP: OnceLock<Mutex<Option<usize>>> = OnceLock::new();
fn hook_state() -> &'static Mutex<HookState> {
    HOOK_STATE.get_or_init(|| {
        Mutex::new(HookState {
            recognizer: RightAltHotkeyRecognizer::new(),
            action_tx: None,
            right_command_down: false,
            right_shift_down: false,
        })
    })
}

fn run_loop_slot() -> &'static Mutex<Option<usize>> {
    RUN_LOOP.get_or_init(|| Mutex::new(None))
}

pub struct MacHookHandle {
    tap: usize,
    source: usize,
    hook_thread: Option<JoinHandle<()>>,
    pump_thread: Option<JoinHandle<()>>,
}

pub fn install<F>(on_action: F) -> Result<MacHookHandle, String>
where
    F: Fn(HotkeyAction) + Send + 'static,
{
    {
        let mut guard = hook_state().lock().map_err(|e| e.to_string())?;
        if guard.action_tx.is_some() {
            return Err("keyboard hook already installed".into());
        }
        guard.action_tx = None;
        guard.right_command_down = false;
        guard.right_shift_down = false;
    }

    let (action_tx, action_rx) = mpsc::channel::<HotkeyAction>();
    let (install_tx, install_rx) = mpsc::channel::<Result<(usize, usize), String>>();

    {
        let mut guard = hook_state().lock().map_err(|e| e.to_string())?;
        guard.action_tx = Some(action_tx);
    }

    let hook_thread = thread::spawn(move || unsafe {
        let mask = event_mask(K_CG_EVENT_KEY_DOWN)
            | event_mask(K_CG_EVENT_KEY_UP)
            | event_mask(K_CG_EVENT_FLAGS_CHANGED);
        let tap = CGEventTapCreate(
            K_CG_SESSION_EVENT_TAP,
            K_CG_HEAD_INSERT_EVENT_TAP,
            K_CG_EVENT_TAP_OPTION_DEFAULT,
            mask,
            event_tap_callback,
            ptr::null_mut(),
        );
        if tap.is_null() {
            let _ = install_tx.send(Err(
                "CGEventTapCreate failed; enable Accessibility/Input Monitoring permission"
                    .to_string(),
            ));
            clear_sender();
            return;
        }

        let source = CFMachPortCreateRunLoopSource(K_CF_ALLOCATOR_DEFAULT, tap, 0);
        if source.is_null() {
            let _ = install_tx.send(Err("CFMachPortCreateRunLoopSource failed".to_string()));
            CFRelease(tap.cast());
            clear_sender();
            return;
        }

        let run_loop = CFRunLoopGetCurrent();
        if let Ok(mut guard) = run_loop_slot().lock() {
            *guard = Some(run_loop as usize);
        }
        CFRunLoopAddSource(run_loop, source, kCFRunLoopDefaultMode);
        CGEventTapEnable(tap, true);
        let _ = install_tx.send(Ok((tap as usize, source as usize)));
        CFRunLoopRun();
        CGEventTapEnable(tap, false);
        CFRelease(source.cast());
        CFRelease(tap.cast());
        clear_sender();
        if let Ok(mut guard) = run_loop_slot().lock() {
            *guard = None;
        }
    });

    let (tap, source) = match install_rx.recv() {
        Ok(Ok(handles)) => handles,
        Ok(Err(error)) => {
            let _ = hook_thread.join();
            return Err(error);
        }
        Err(error) => return Err(error.to_string()),
    };

    let pump_thread = thread::spawn(move || {
        while let Ok(action) = action_rx.recv() {
            on_action(action);
        }
    });

    Ok(MacHookHandle {
        tap,
        source,
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

pub fn uninstall(mut handle: MacHookHandle) -> Result<(), String> {
    let _ = (handle.tap, handle.source);
    if let Ok(guard) = run_loop_slot().lock() {
        if let Some(run_loop) = *guard {
            unsafe { CFRunLoopStop(run_loop as CFRunLoopRef) };
        }
    }

    if let Some(join) = handle.hook_thread.take() {
        let _ = join.join();
    }
    clear_sender();
    if let Some(join) = handle.pump_thread.take() {
        let _ = join.join();
    }
    Ok(())
}

fn clear_sender() {
    if let Ok(mut guard) = hook_state().lock() {
        guard.action_tx = None;
        guard.right_command_down = false;
        guard.right_shift_down = false;
    }
}

fn event_mask(event_type: CGEventType) -> CGEventMask {
    1_u64 << event_type
}

unsafe extern "C" fn event_tap_callback(
    _proxy: CGEventTapProxy,
    event_type: CGEventType,
    event: CGEventRef,
    _user_info: *mut c_void,
) -> CGEventRef {
    if event_type == K_CG_EVENT_TAP_DISABLED_BY_TIMEOUT
        || event_type == K_CG_EVENT_TAP_DISABLED_BY_USER_INPUT
    {
        return event;
    }

    let raw_key_code = CGEventGetIntegerValueField(event, K_CG_KEYBOARD_EVENT_KEYCODE);
    let Some((key_code, transition)) = map_macos_key_event(raw_key_code, event_type) else {
        return event;
    };

    let mut suppress_event = false;
    let mut should_schedule_shortcut_help = false;
    let mut shortcut_help_generation = 0;

    if let Ok(mut guard) = hook_state().lock() {
        let previous_generation = guard.recognizer.pending_generation();
        let result = guard.recognizer.handle_hook_event(KeyEvent {
            key_code,
            transition,
        });
        suppress_event = result.suppress;
        if key_code == RIGHT_ALT_KEY_CODE {
            guard.right_command_down = transition == KeyTransition::Down;
        } else if key_code == RIGHT_SHIFT_KEY_CODE {
            guard.right_shift_down = transition == KeyTransition::Down;
        }
        let next_generation = guard.recognizer.pending_generation();
        if transition == KeyTransition::Down
            && next_generation.is_some()
            && next_generation != previous_generation
        {
            shortcut_help_generation = next_generation.expect("checked is_some");
            should_schedule_shortcut_help = true;
        }

        if let Some(action) = result.action {
            send_action(&guard, action);
        }
    }

    if should_schedule_shortcut_help {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(SHORTCUT_HELP_HOLD_MS));
            let (action, tx) = match hook_state().lock() {
                Ok(mut guard) => {
                    let is_current_press =
                        guard.recognizer.pending_generation() == Some(shortcut_help_generation);
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

    if suppress_event {
        return ptr::null_mut();
    }

    event
}

fn send_action(guard: &HookState, action: HotkeyAction) {
    if let Some(tx) = &guard.action_tx {
        let _ = tx.send(action);
    }
}

fn map_macos_key_event(
    raw_key_code: i64,
    event_type: CGEventType,
) -> Option<(u32, KeyTransition)> {
    let key_code = match raw_key_code as CGKeyCode {
        KVK_RIGHT_COMMAND => RIGHT_ALT_KEY_CODE,
        KVK_RIGHT_SHIFT => RIGHT_SHIFT_KEY_CODE,
        KVK_SPACE => SPACE_KEY_CODE,
        KVK_SLASH => 0xBF,
        _ => return None,
    };
    let transition = match event_type {
        K_CG_EVENT_KEY_DOWN => KeyTransition::Down,
        K_CG_EVENT_KEY_UP => KeyTransition::Up,
        K_CG_EVENT_FLAGS_CHANGED => {
            let is_down = hook_state()
                .lock()
                .ok()
                .map(|guard| match key_code {
                    RIGHT_ALT_KEY_CODE => !guard.right_command_down,
                    RIGHT_SHIFT_KEY_CODE => !guard.right_shift_down,
                    _ => false,
                })
                .unwrap_or(false);
            if is_down {
                KeyTransition::Down
            } else {
                KeyTransition::Up
            }
        }
        _ => return None,
    };
    Some((key_code, transition))
}
