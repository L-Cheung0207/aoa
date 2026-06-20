use crate::NativeHelperResult;

#[cfg(windows)]
pub fn mute_other_apps_for_recording(excluded_process_ids: &[u32]) -> NativeHelperResult<()> {
    windows_audio::mute_other_apps_for_recording(excluded_process_ids)
}

#[cfg(windows)]
pub fn restore_other_apps_audio() -> NativeHelperResult<()> {
    windows_audio::restore_other_apps_audio()
}

#[cfg(target_os = "macos")]
pub fn mute_other_apps_for_recording(_excluded_process_ids: &[u32]) -> NativeHelperResult<()> {
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn restore_other_apps_audio() -> NativeHelperResult<()> {
    Ok(())
}

#[cfg(not(any(windows, target_os = "macos")))]
pub fn mute_other_apps_for_recording(_excluded_process_ids: &[u32]) -> NativeHelperResult<()> {
    Err(NativeHelperError::UnsupportedPlatform)
}

#[cfg(not(any(windows, target_os = "macos")))]
pub fn restore_other_apps_audio() -> NativeHelperResult<()> {
    Err(NativeHelperError::UnsupportedPlatform)
}

#[cfg(windows)]
mod windows_audio {
    use crate::{NativeHelperError, NativeHelperResult};
    use std::collections::HashSet;
    use std::ffi::c_void;
    use std::ptr::null;
    use std::sync::{Mutex, OnceLock};
    use windows::core::{Interface, PWSTR};
    use windows::Win32::Foundation::{RPC_E_CHANGED_MODE, S_FALSE, S_OK};
    use windows::Win32::Media::Audio::{
        eConsole, eRender, AudioSessionStateExpired, IAudioSessionControl, IAudioSessionControl2,
        IAudioSessionManager2, IMMDeviceEnumerator, ISimpleAudioVolume, MMDeviceEnumerator,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
        COINIT_APARTMENTTHREADED,
    };

    static MUTED_SESSIONS: OnceLock<Mutex<Vec<MutedSessionState>>> = OnceLock::new();

    struct AudioSessionSnapshot {
        control: IAudioSessionControl2,
        instance_id: String,
    }

    struct MutedSessionState {
        instance_id: String,
        was_muted: bool,
    }

    fn muted_sessions() -> &'static Mutex<Vec<MutedSessionState>> {
        MUTED_SESSIONS.get_or_init(|| Mutex::new(Vec::new()))
    }

    pub fn mute_other_apps_for_recording(excluded_process_ids: &[u32]) -> NativeHelperResult<()> {
        let _com = ComApartment::initialize()?;
        let excluded_process_ids: HashSet<u32> = excluded_process_ids.iter().copied().collect();
        let mut muted_sessions = muted_sessions()
            .lock()
            .map_err(|error| NativeHelperError::InputUnavailable(error.to_string()))?;

        if !muted_sessions.is_empty() {
            return Ok(());
        }

        for session in enumerate_render_sessions()? {
            let process_id = unsafe { session.control.GetProcessId() }.map_err(to_audio_error)?;
            if excluded_process_ids.contains(&process_id) {
                continue;
            }

            if unsafe { session.control.IsSystemSoundsSession() } == S_OK {
                continue;
            }

            if unsafe { session.control.GetState() }.map_err(to_audio_error)?
                == AudioSessionStateExpired
            {
                continue;
            }

            let volume: ISimpleAudioVolume = session.control.cast().map_err(to_audio_error)?;
            let was_muted = unsafe { volume.GetMute() }
                .map_err(to_audio_error)?
                .as_bool();

            if !was_muted {
                unsafe { volume.SetMute(true, null()) }.map_err(to_audio_error)?;
            }

            muted_sessions.push(MutedSessionState {
                instance_id: session.instance_id,
                was_muted,
            });
        }

        Ok(())
    }

    pub fn restore_other_apps_audio() -> NativeHelperResult<()> {
        let _com = ComApartment::initialize()?;
        let mut muted_sessions = muted_sessions()
            .lock()
            .map_err(|error| NativeHelperError::InputUnavailable(error.to_string()))?;

        let sessions = std::mem::take(&mut *muted_sessions);
        let current_sessions = enumerate_render_sessions()?;
        let mut first_error: Option<NativeHelperError> = None;
        for session in sessions {
            if !session.was_muted {
                let result = current_sessions
                    .iter()
                    .find(|candidate| candidate.instance_id == session.instance_id)
                    .map(|candidate| {
                        candidate
                            .control
                            .cast::<ISimpleAudioVolume>()
                            .map_err(to_audio_error)
                            .and_then(|volume| unsafe {
                                volume.SetMute(false, null()).map_err(to_audio_error)
                            })
                    })
                    .unwrap_or(Ok(()));
                if first_error.is_none() {
                    first_error = result.err();
                }
            }
        }

        match first_error {
            Some(error) => Err(error),
            None => Ok(()),
        }
    }

    fn enumerate_render_sessions() -> NativeHelperResult<Vec<AudioSessionSnapshot>> {
        unsafe {
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(to_audio_error)?;
            let device = enumerator
                .GetDefaultAudioEndpoint(eRender, eConsole)
                .map_err(to_audio_error)?;
            let manager: IAudioSessionManager2 =
                device.Activate(CLSCTX_ALL, None).map_err(to_audio_error)?;
            let session_enumerator = manager.GetSessionEnumerator().map_err(to_audio_error)?;
            let count = session_enumerator.GetCount().map_err(to_audio_error)?;
            let mut sessions = Vec::with_capacity(count as usize);

            for index in 0..count {
                let control: IAudioSessionControl = session_enumerator
                    .GetSession(index)
                    .map_err(to_audio_error)?;
                if let Ok(control2) = control.cast::<IAudioSessionControl2>() {
                    let instance_id = pwstr_to_string(
                        control2
                            .GetSessionInstanceIdentifier()
                            .map_err(to_audio_error)?,
                    )?;
                    sessions.push(AudioSessionSnapshot {
                        control: control2,
                        instance_id,
                    });
                }
            }

            Ok(sessions)
        }
    }

    fn pwstr_to_string(value: PWSTR) -> NativeHelperResult<String> {
        if value.is_null() {
            return Ok(String::new());
        }

        let result = unsafe { value.to_string() }
            .map_err(|error| NativeHelperError::InputUnavailable(error.to_string()));
        unsafe {
            CoTaskMemFree(Some(value.0 as *const c_void));
        }
        result
    }

    struct ComApartment {
        should_uninitialize: bool,
    }

    impl ComApartment {
        fn initialize() -> NativeHelperResult<Self> {
            let result = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
            if result == S_OK || result == S_FALSE {
                return Ok(Self {
                    should_uninitialize: true,
                });
            }
            if result == RPC_E_CHANGED_MODE {
                return Ok(Self {
                    should_uninitialize: false,
                });
            }
            if let Err(error) = result.ok() {
                return Err(to_audio_error(error));
            }
            Ok(Self {
                should_uninitialize: true,
            })
        }
    }

    impl Drop for ComApartment {
        fn drop(&mut self) {
            if self.should_uninitialize {
                unsafe {
                    CoUninitialize();
                }
            }
        }
    }

    fn to_audio_error(error: windows::core::Error) -> NativeHelperError {
        NativeHelperError::InputUnavailable(format!("AUDIO_DUCKING_UNAVAILABLE: {error}"))
    }
}
