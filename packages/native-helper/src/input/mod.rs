use crate::{ensure_supported_platform, NativeHelperResult};

const VK_CONTROL_CODE: u16 = 0x11;
const VK_C_CODE: u16 = 0x43;
const VK_V_CODE: u16 = 0x56;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputEvent {
    VirtualKeyDown(u16),
    VirtualKeyUp(u16),
    UnicodeDown(u16),
    UnicodeUp(u16),
}

pub fn paste_from_clipboard() -> NativeHelperResult<()> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        send_input_events(&build_ctrl_v_events())
    }

    #[cfg(target_os = "macos")]
    {
        send_command_key(MACOS_V_KEY_CODE)
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        unreachable!("platform is checked before this branch")
    }
}

pub fn type_text(_text: &str) -> NativeHelperResult<()> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        send_input_events(&build_unicode_text_events(_text))
    }

    #[cfg(target_os = "macos")]
    {
        send_unicode_text(_text)
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        unreachable!("platform is checked before this branch")
    }
}

pub fn copy_selection_to_clipboard() -> NativeHelperResult<()> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        send_input_events(&build_ctrl_c_events())
    }

    #[cfg(target_os = "macos")]
    {
        send_command_key(MACOS_C_KEY_CODE)
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        unreachable!("platform is checked before this branch")
    }
}

pub fn build_ctrl_c_events() -> Vec<InputEvent> {
    vec![
        InputEvent::VirtualKeyDown(VK_CONTROL_CODE),
        InputEvent::VirtualKeyDown(VK_C_CODE),
        InputEvent::VirtualKeyUp(VK_C_CODE),
        InputEvent::VirtualKeyUp(VK_CONTROL_CODE),
    ]
}

pub fn build_ctrl_v_events() -> Vec<InputEvent> {
    vec![
        InputEvent::VirtualKeyDown(VK_CONTROL_CODE),
        InputEvent::VirtualKeyDown(VK_V_CODE),
        InputEvent::VirtualKeyUp(VK_V_CODE),
        InputEvent::VirtualKeyUp(VK_CONTROL_CODE),
    ]
}

pub fn build_unicode_text_events(text: &str) -> Vec<InputEvent> {
    text.encode_utf16()
        .flat_map(|code_unit| {
            [
                InputEvent::UnicodeDown(code_unit),
                InputEvent::UnicodeUp(code_unit),
            ]
        })
        .collect()
}

#[cfg(windows)]
fn send_input_events(events: &[InputEvent]) -> NativeHelperResult<()> {
    use crate::NativeHelperError;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        KEYEVENTF_UNICODE, VIRTUAL_KEY,
    };

    let inputs: Vec<INPUT> = events
        .iter()
        .map(|event| {
            let (virtual_key, scan_code, flags) = match *event {
                InputEvent::VirtualKeyDown(code) => (VIRTUAL_KEY(code), 0, KEYBD_EVENT_FLAGS(0)),
                InputEvent::VirtualKeyUp(code) => (VIRTUAL_KEY(code), 0, KEYEVENTF_KEYUP),
                InputEvent::UnicodeDown(code_unit) => {
                    (VIRTUAL_KEY(0), code_unit, KEYEVENTF_UNICODE)
                }
                InputEvent::UnicodeUp(code_unit) => (
                    VIRTUAL_KEY(0),
                    code_unit,
                    KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                ),
            };

            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: virtual_key,
                        wScan: scan_code,
                        dwFlags: flags,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            }
        })
        .collect();

    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };

    if sent == inputs.len() as u32 {
        Ok(())
    } else {
        Err(NativeHelperError::InputUnavailable(format!(
            "SendInput sent {sent}/{} events",
            inputs.len()
        )))
    }
}

#[cfg(target_os = "macos")]
const MACOS_C_KEY_CODE: u16 = 0x08;
#[cfg(target_os = "macos")]
const MACOS_V_KEY_CODE: u16 = 0x09;

#[cfg(target_os = "macos")]
fn send_command_key(key_code: u16) -> NativeHelperResult<()> {
    send_macos_key(key_code, true)?;
    send_macos_key(key_code, false)
}

#[cfg(target_os = "macos")]
fn send_unicode_text(text: &str) -> NativeHelperResult<()> {
    for code_unit in text.encode_utf16() {
        send_macos_unicode(code_unit, true)?;
        send_macos_unicode(code_unit, false)?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn send_macos_key(key_code: u16, down: bool) -> NativeHelperResult<()> {
    macos_input::post_key_event(key_code, down, macos_input::COMMAND_FLAG)
}

#[cfg(target_os = "macos")]
fn send_macos_unicode(code_unit: u16, down: bool) -> NativeHelperResult<()> {
    macos_input::post_unicode_event(code_unit, down)
}

#[cfg(target_os = "macos")]
mod macos_input {
    use crate::{NativeHelperError, NativeHelperResult};
    use std::ffi::c_void;

    type CGEventRef = *mut c_void;
    type CGEventSourceRef = *mut c_void;
    type CGEventSourceStateID = u32;
    type CGEventTapLocation = u32;
    type CGEventFlags = u64;
    type CGKeyCode = u16;

    const K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE: CGEventSourceStateID = 1;
    const K_CG_HID_EVENT_TAP: CGEventTapLocation = 0;
    pub const COMMAND_FLAG: CGEventFlags = 1 << 20;

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn CGEventSourceCreate(state_id: CGEventSourceStateID) -> CGEventSourceRef;
        fn CGEventCreateKeyboardEvent(
            source: CGEventSourceRef,
            virtual_key: CGKeyCode,
            key_down: bool,
        ) -> CGEventRef;
        fn CGEventSetFlags(event: CGEventRef, flags: CGEventFlags);
        fn CGEventKeyboardSetUnicodeString(
            event: CGEventRef,
            string_length: usize,
            unicode_string: *const u16,
        );
        fn CGEventPost(tap: CGEventTapLocation, event: CGEventRef);
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFRelease(cf: *const c_void);
    }

    pub fn post_key_event(
        key_code: CGKeyCode,
        down: bool,
        flags: CGEventFlags,
    ) -> NativeHelperResult<()> {
        unsafe {
            let source = create_source()?;
            let event = CGEventCreateKeyboardEvent(source, key_code, down);
            if event.is_null() {
                CFRelease(source.cast());
                return Err(NativeHelperError::InputUnavailable(
                    "CGEventCreateKeyboardEvent failed".to_string(),
                ));
            }
            CGEventSetFlags(event, flags);
            CGEventPost(K_CG_HID_EVENT_TAP, event);
            CFRelease(event.cast());
            CFRelease(source.cast());
        }
        Ok(())
    }

    pub fn post_unicode_event(code_unit: u16, down: bool) -> NativeHelperResult<()> {
        unsafe {
            let source = create_source()?;
            let event = CGEventCreateKeyboardEvent(source, 0, down);
            if event.is_null() {
                CFRelease(source.cast());
                return Err(NativeHelperError::InputUnavailable(
                    "CGEventCreateKeyboardEvent failed".to_string(),
                ));
            }
            CGEventKeyboardSetUnicodeString(event, 1, &code_unit);
            CGEventPost(K_CG_HID_EVENT_TAP, event);
            CFRelease(event.cast());
            CFRelease(source.cast());
        }
        Ok(())
    }

    unsafe fn create_source() -> NativeHelperResult<CGEventSourceRef> {
        let source = CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE);
        if source.is_null() {
            Err(NativeHelperError::InputUnavailable(
                "CGEventSourceCreate failed; enable Accessibility permission".to_string(),
            ))
        } else {
            Ok(source)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{build_ctrl_c_events, build_ctrl_v_events, build_unicode_text_events, InputEvent};
    use crate::NativeHelperError;

    #[test]
    fn paste_reports_unsupported_platform_outside_supported_targets() {
        if !cfg!(any(windows, target_os = "macos")) {
            assert_eq!(
                super::paste_from_clipboard(),
                Err(NativeHelperError::UnsupportedPlatform)
            );
        }
    }

    #[test]
    fn copy_reports_unsupported_platform_outside_supported_targets() {
        if !cfg!(any(windows, target_os = "macos")) {
            assert_eq!(
                super::copy_selection_to_clipboard(),
                Err(NativeHelperError::UnsupportedPlatform)
            );
        }
    }

    #[test]
    fn builds_ctrl_c_as_control_down_c_down_c_up_control_up() {
        assert_eq!(
            build_ctrl_c_events(),
            vec![
                InputEvent::VirtualKeyDown(0x11),
                InputEvent::VirtualKeyDown(0x43),
                InputEvent::VirtualKeyUp(0x43),
                InputEvent::VirtualKeyUp(0x11),
            ]
        );
    }

    #[test]
    fn builds_ctrl_v_as_control_down_v_down_v_up_control_up() {
        assert_eq!(
            build_ctrl_v_events(),
            vec![
                InputEvent::VirtualKeyDown(0x11),
                InputEvent::VirtualKeyDown(0x56),
                InputEvent::VirtualKeyUp(0x56),
                InputEvent::VirtualKeyUp(0x11),
            ]
        );
    }

    #[test]
    fn builds_unicode_typing_as_down_up_pairs() {
        assert_eq!(
            build_unicode_text_events("A你"),
            vec![
                InputEvent::UnicodeDown('A' as u16),
                InputEvent::UnicodeUp('A' as u16),
                InputEvent::UnicodeDown('你' as u16),
                InputEvent::UnicodeUp('你' as u16),
            ]
        );
    }
}
