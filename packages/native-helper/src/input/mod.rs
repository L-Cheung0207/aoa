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

    #[cfg(not(windows))]
    {
        unreachable!("platform is checked before this branch");
    }
}

pub fn type_text(text: &str) -> NativeHelperResult<()> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        send_input_events(&build_unicode_text_events(text))
    }

    #[cfg(not(windows))]
    {
        unreachable!("platform is checked before this branch");
    }
}

pub fn copy_selection_to_clipboard() -> NativeHelperResult<()> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        send_input_events(&build_ctrl_c_events())
    }

    #[cfg(not(windows))]
    {
        unreachable!("platform is checked before this branch");
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
        .flat_map(|code_unit| [InputEvent::UnicodeDown(code_unit), InputEvent::UnicodeUp(code_unit)])
        .collect()
}

#[cfg(windows)]
fn send_input_events(events: &[InputEvent]) -> NativeHelperResult<()> {
    use crate::NativeHelperError;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
        KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, VIRTUAL_KEY,
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
                InputEvent::UnicodeUp(code_unit) => {
                    (VIRTUAL_KEY(0), code_unit, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP)
                }
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

#[cfg(test)]
mod tests {
    use super::{
        build_ctrl_c_events, build_ctrl_v_events, build_unicode_text_events,
        copy_selection_to_clipboard, paste_from_clipboard, InputEvent,
    };
    use crate::NativeHelperError;

    #[test]
    fn paste_reports_unsupported_platform_outside_windows() {
        if !cfg!(windows) {
            assert_eq!(
                paste_from_clipboard(),
                Err(NativeHelperError::UnsupportedPlatform)
            );
        }
    }

    #[test]
    fn copy_reports_unsupported_platform_outside_windows() {
        if !cfg!(windows) {
            assert_eq!(
                copy_selection_to_clipboard(),
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
