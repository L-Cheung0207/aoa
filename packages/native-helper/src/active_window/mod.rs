use crate::{ensure_supported_platform, NativeHelperError, NativeHelperResult};

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

    #[cfg(target_os = "macos")]
    {
        macos_active_app_snapshot()
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        unreachable!("platform is checked before this branch")
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

    #[cfg(target_os = "macos")]
    {
        macos_frontmost_process_id()
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        unreachable!("platform is checked before this branch")
    }
}

pub fn focus_window(_window_handle: &str) -> NativeHelperResult<()> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        focus_window_by_handle(_window_handle)
    }

    #[cfg(target_os = "macos")]
    {
        macos_activate_process(_window_handle)
    }

    #[cfg(not(any(windows, target_os = "macos")))]
    {
        unreachable!("platform is checked before this branch")
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
        let attached =
            should_attach && AttachThreadInput(current_thread_id, target_thread_id, true).as_bool();

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

#[cfg(target_os = "macos")]
#[link(name = "AppKit", kind = "framework")]
extern "C" {}

#[cfg(target_os = "macos")]
#[link(name = "Foundation", kind = "framework")]
extern "C" {}

#[cfg(target_os = "macos")]
#[link(name = "objc", kind = "dylib")]
extern "C" {}

#[cfg(target_os = "macos")]
fn macos_frontmost_process_id() -> NativeHelperResult<Option<String>> {
    macos::frontmost_process_identifier().map(|pid| Some(pid.to_string()))
}

#[cfg(target_os = "macos")]
fn macos_active_app_snapshot() -> NativeHelperResult<ActiveWindowSnapshot> {
    Ok(ActiveWindowSnapshot {
        app_name: macos::frontmost_localized_name().unwrap_or_default(),
        window_title: String::new(),
    })
}

#[cfg(target_os = "macos")]
fn macos_activate_process(process_id: &str) -> NativeHelperResult<()> {
    let pid = process_id.parse::<i32>().map_err(|error| {
        NativeHelperError::InputUnavailable(format!(
            "invalid process identifier \"{process_id}\": {error}"
        ))
    })?;
    macos::activate_process_identifier(pid)
}

#[cfg(target_os = "macos")]
#[allow(clashing_extern_declarations)]
mod macos {
    use crate::{NativeHelperError, NativeHelperResult};
    use std::ffi::c_void;
    use std::os::raw::{c_char, c_ulong};

    type Id = *mut c_void;
    type Sel = *mut c_void;
    type Class = *mut c_void;
    type Bool = c_char;
    type NSUInteger = c_ulong;

    const NS_UTF8_STRING_ENCODING: NSUInteger = 4;
    const NS_APPLICATION_ACTIVATE_IGNORING_OTHER_APPS: NSUInteger = 1;

    #[link(name = "objc", kind = "dylib")]
    extern "C" {
        fn objc_getClass(name: *const c_char) -> Class;
        fn sel_registerName(name: *const c_char) -> Sel;
        #[link_name = "objc_msgSend"]
        fn msg_send_id(receiver: Id, selector: Sel) -> Id;
        #[link_name = "objc_msgSend"]
        fn msg_send_i32(receiver: Id, selector: Sel) -> i32;
        #[link_name = "objc_msgSend"]
        fn msg_send_bool_uinteger(receiver: Id, selector: Sel, value: NSUInteger) -> Bool;
        #[link_name = "objc_msgSend"]
        fn msg_send_id_i32(receiver: Id, selector: Sel, value: i32) -> Id;
        #[link_name = "objc_msgSend"]
        fn msg_send_ptr_uinteger(receiver: Id, selector: Sel, value: NSUInteger) -> *const c_char;
    }

    pub fn frontmost_process_identifier() -> NativeHelperResult<i32> {
        let workspace = shared_workspace()?;
        let app = unsafe { msg_send_id(workspace, selector(b"frontmostApplication\0")?) };
        if app.is_null() {
            return Err(NativeHelperError::InputUnavailable(
                "NSWorkspace frontmostApplication returned nil".to_string(),
            ));
        }
        Ok(unsafe { msg_send_i32(app, selector(b"processIdentifier\0")?) })
    }

    pub fn frontmost_localized_name() -> Option<String> {
        let workspace = shared_workspace().ok()?;
        let app = unsafe { msg_send_id(workspace, selector(b"frontmostApplication\0").ok()?) };
        if app.is_null() {
            return None;
        }
        let name = unsafe { msg_send_id(app, selector(b"localizedName\0").ok()?) };
        ns_string_to_string(name)
    }

    pub fn activate_process_identifier(process_identifier: i32) -> NativeHelperResult<()> {
        let running_application_class = class(b"NSRunningApplication\0")?;
        let app = unsafe {
            msg_send_id_i32(
                running_application_class.cast(),
                selector(b"runningApplicationWithProcessIdentifier:\0")?,
                process_identifier,
            )
        };
        if app.is_null() {
            return Err(NativeHelperError::InputUnavailable(format!(
                "no running application for process identifier: {process_identifier}"
            )));
        }

        let activated = unsafe {
            msg_send_bool_uinteger(
                app,
                selector(b"activateWithOptions:\0")?,
                NS_APPLICATION_ACTIVATE_IGNORING_OTHER_APPS,
            )
        } != 0;
        if !activated {
            return Err(NativeHelperError::InputUnavailable(format!(
                "activateWithOptions failed for process identifier: {process_identifier}"
            )));
        }

        Ok(())
    }

    fn shared_workspace() -> NativeHelperResult<Id> {
        let workspace_class = class(b"NSWorkspace\0")?;
        let workspace =
            unsafe { msg_send_id(workspace_class.cast(), selector(b"sharedWorkspace\0")?) };
        if workspace.is_null() {
            Err(NativeHelperError::InputUnavailable(
                "NSWorkspace sharedWorkspace returned nil".to_string(),
            ))
        } else {
            Ok(workspace)
        }
    }

    fn ns_string_to_string(value: Id) -> Option<String> {
        if value.is_null() {
            return None;
        }
        let c_string = unsafe {
            msg_send_ptr_uinteger(
                value,
                selector(b"cStringUsingEncoding:\0").ok()?,
                NS_UTF8_STRING_ENCODING,
            )
        };
        if c_string.is_null() {
            return None;
        }
        let string = unsafe { std::ffi::CStr::from_ptr(c_string) };
        Some(string.to_string_lossy().into_owned())
    }

    fn class(name: &'static [u8]) -> NativeHelperResult<Class> {
        let class = unsafe { objc_getClass(name.as_ptr().cast()) };
        if class.is_null() {
            Err(NativeHelperError::InputUnavailable(format!(
                "Objective-C class not found: {}",
                String::from_utf8_lossy(&name[..name.len().saturating_sub(1)])
            )))
        } else {
            Ok(class)
        }
    }

    fn selector(name: &'static [u8]) -> NativeHelperResult<Sel> {
        let selector = unsafe { sel_registerName(name.as_ptr().cast()) };
        if selector.is_null() {
            Err(NativeHelperError::InputUnavailable(format!(
                "Objective-C selector not found: {}",
                String::from_utf8_lossy(&name[..name.len().saturating_sub(1)])
            )))
        } else {
            Ok(selector)
        }
    }
}
