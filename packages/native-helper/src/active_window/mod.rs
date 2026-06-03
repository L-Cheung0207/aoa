use crate::{ensure_supported_platform, NativeHelperResult};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActiveWindowSnapshot {
    pub app_name: String,
    pub window_title: String,
}

pub fn get_active_window() -> NativeHelperResult<ActiveWindowSnapshot> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        let handle = get_foreground_window()?;
        Ok(ActiveWindowSnapshot {
            app_name: String::new(),
            window_title: get_window_title(handle),
        })
    }

    #[cfg(not(windows))]
    {
        unreachable!("platform is checked before this branch");
    }
}

pub fn get_foreground_window_handle() -> NativeHelperResult<Option<String>> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        let handle = get_foreground_window()?;
        if handle.0.is_null() {
            return Ok(None);
        }

        Ok(Some((handle.0 as usize).to_string()))
    }

    #[cfg(not(windows))]
    {
        unreachable!("platform is checked before this branch");
    }
}

pub fn focus_window(window_handle: &str) -> NativeHelperResult<()> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        focus_window_by_handle(window_handle)
    }

    #[cfg(not(windows))]
    {
        unreachable!("platform is checked before this branch");
    }
}

#[cfg(windows)]
fn get_foreground_window() -> NativeHelperResult<windows::Win32::Foundation::HWND> {
    use crate::NativeHelperError;
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

    let handle = unsafe { GetForegroundWindow() };
    if handle.0.is_null() {
        return Err(NativeHelperError::InputUnavailable(
            "GetForegroundWindow returned null".to_string(),
        ));
    }

    Ok(handle)
}

#[cfg(windows)]
fn focus_window_by_handle(window_handle: &str) -> NativeHelperResult<()> {
    use crate::NativeHelperError;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
    use windows::Win32::UI::WindowsAndMessaging::{
        BringWindowToTop, GetForegroundWindow, GetWindowThreadProcessId, IsWindow,
        SetForegroundWindow,
    };

    let raw_handle = window_handle.parse::<usize>().map_err(|error| {
        NativeHelperError::InputUnavailable(format!(
            "invalid window handle \"{window_handle}\": {error}"
        ))
    })?;
    let handle = HWND(raw_handle as *mut _);

    unsafe {
        if !IsWindow(handle).as_bool() {
            return Err(NativeHelperError::InputUnavailable(format!(
                "window handle is no longer valid: {window_handle}"
            )));
        }

        let target_thread_id = GetWindowThreadProcessId(handle, None);
        let current_thread_id = GetCurrentThreadId();
        let should_attach = target_thread_id != 0 && target_thread_id != current_thread_id;
        let attached = should_attach
            && AttachThreadInput(current_thread_id, target_thread_id, true).as_bool();

        let _ = BringWindowToTop(handle);
        let focused = SetForegroundWindow(handle).as_bool();

        if attached {
            let _ = AttachThreadInput(current_thread_id, target_thread_id, false);
        }

        let foreground = GetForegroundWindow();
        if focused || foreground == handle {
            Ok(())
        } else {
            Err(NativeHelperError::InputUnavailable(format!(
                "SetForegroundWindow failed for handle: {window_handle}"
            )))
        }
    }
}

#[cfg(windows)]
fn get_window_title(handle: windows::Win32::Foundation::HWND) -> String {
    use windows::Win32::UI::WindowsAndMessaging::{GetWindowTextLengthW, GetWindowTextW};

    unsafe {
        let length = GetWindowTextLengthW(handle);
        if length <= 0 {
            return String::new();
        }

        let mut buffer = vec![0_u16; length as usize + 1];
        let written = GetWindowTextW(handle, &mut buffer);
        if written <= 0 {
            return String::new();
        }

        String::from_utf16_lossy(&buffer[..written as usize])
    }
}
