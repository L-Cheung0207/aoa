use crate::{ensure_supported_platform, NativeHelperResult};

pub fn is_editable_target_focused() -> NativeHelperResult<bool> {
    ensure_supported_platform()?;

    #[cfg(windows)]
    {
        match is_focused_element_editable_by_uia() {
            Ok(editable) => Ok(editable),
            Err(error) => {
                eprintln!("[native-helper] UIA editable check failed: {error}");
                is_focused_window_class_editable()
            }
        }
    }

    #[cfg(not(windows))]
    {
        unreachable!("platform is checked before this branch");
    }
}

#[cfg(windows)]
fn is_focused_element_editable_by_uia() -> NativeHelperResult<bool> {
    use crate::NativeHelperError;
    use windows::Win32::Foundation::{RPC_E_CHANGED_MODE, S_FALSE, S_OK};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE,
    };
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationValuePattern,
        UIA_DocumentControlTypeId, UIA_EditControlTypeId, UIA_ValuePatternId,
    };
    use windows::core::Result as WindowsResult;

    let coinit = unsafe {
        CoInitializeEx(
            None,
            COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE,
        )
    };
    let should_uninitialize = coinit == S_OK || coinit == S_FALSE;
    if coinit.is_err() && coinit != RPC_E_CHANGED_MODE {
        return Err(NativeHelperError::InputUnavailable(format!(
            "CoInitializeEx failed: 0x{:08x}",
            coinit.0 as u32
        )));
    }

    let result = (|| -> WindowsResult<bool> {
        let automation: IUIAutomation =
            unsafe { CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)? };
        let element = unsafe { automation.GetFocusedElement()? };

        if let Ok(is_enabled) = unsafe { element.CurrentIsEnabled() } {
            if !is_enabled.as_bool() {
                return Ok(false);
            }
        }

        if let Ok(value_pattern) = unsafe {
            element.GetCurrentPatternAs::<IUIAutomationValuePattern>(UIA_ValuePatternId)
        } {
            let is_read_only = unsafe { value_pattern.CurrentIsReadOnly()? };
            return Ok(!is_read_only.as_bool());
        }

        let control_type = unsafe { element.CurrentControlType()? };
        Ok(control_type == UIA_EditControlTypeId || control_type == UIA_DocumentControlTypeId)
    })();

    if should_uninitialize {
        unsafe { CoUninitialize() };
    }

    result.map_err(|error| NativeHelperError::InputUnavailable(error.to_string()))
}

#[cfg(windows)]
fn is_focused_window_class_editable() -> NativeHelperResult<bool> {
    use crate::NativeHelperError;
    use std::mem::size_of;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetGUIThreadInfo, GUITHREADINFO,
    };

    let mut info = GUITHREADINFO::default();
    info.cbSize = size_of::<GUITHREADINFO>() as u32;
    unsafe {
        GetGUIThreadInfo(0, &mut info).map_err(|error| {
            NativeHelperError::InputUnavailable(format!("GetGUIThreadInfo failed: {error}"))
        })?;
    }

    if info.hwndFocus.0.is_null() {
        return Ok(false);
    }

    let mut buffer = [0_u16; 256];
    let length = unsafe { GetClassNameW(info.hwndFocus, &mut buffer) };
    if length <= 0 {
        return Ok(false);
    }

    let class_name = String::from_utf16_lossy(&buffer[..length as usize]).to_ascii_lowercase();
    Ok(is_known_editable_class(&class_name))
}

#[cfg(windows)]
fn is_known_editable_class(class_name: &str) -> bool {
    class_name == "edit"
        || class_name == "richedit"
        || class_name.starts_with("richedit")
        || class_name.starts_with("windowsforms10.edit")
        || class_name.starts_with("thunderrt6textbox")
}

#[cfg(test)]
mod tests {
    use super::is_editable_target_focused;
    use crate::NativeHelperError;

    #[test]
    fn reports_unsupported_platform_outside_windows() {
        if !cfg!(windows) {
            assert_eq!(
                is_editable_target_focused(),
                Err(NativeHelperError::UnsupportedPlatform)
            );
        }
    }
}
