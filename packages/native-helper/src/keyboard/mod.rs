use crate::{ensure_supported_platform, NativeHelperError, NativeHelperResult};

#[cfg(windows)]
pub mod hook_windows;

pub const RIGHT_ALT_KEY_CODE: u32 = 0xA5;
pub const SPACE_KEY_CODE: u32 = 0x20;
pub const RIGHT_SHIFT_KEY_CODE: u32 = 0xA1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HotkeyAction {
    ToggleDirect,
    ProcessSelection,
    TranslateDictation,
    ShortcutHelp,
    ShortcutHelpDismiss,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HotkeyEventResult {
    pub action: Option<HotkeyAction>,
    pub suppress: bool,
}

impl HotkeyEventResult {
    fn pass_through(action: Option<HotkeyAction>) -> Self {
        Self {
            action,
            suppress: false,
        }
    }

    fn suppress(action: Option<HotkeyAction>) -> Self {
        Self {
            action,
            suppress: true,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyTransition {
    Down,
    Up,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KeyEvent {
    pub key_code: u32,
    pub transition: KeyTransition,
}

impl KeyEvent {
    pub fn down(key_code: u32) -> Self {
        Self {
            key_code,
            transition: KeyTransition::Down,
        }
    }

    pub fn up(key_code: u32) -> Self {
        Self {
            key_code,
            transition: KeyTransition::Up,
        }
    }
}

#[derive(Debug, Default)]
pub struct RightAltHotkeyRecognizer {
    bindings: Vec<HotkeyBinding>,
    pressed_keys: Vec<u32>,
    pending: Option<PendingHotkey>,
    pending_generation: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct HotkeyBinding {
    action: HotkeyAction,
    keys: Vec<ShortcutKey>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PendingHotkey {
    action: HotkeyAction,
    keys: Vec<ShortcutKey>,
    generation: u64,
    help_emitted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ShortcutKey {
    variants: Vec<u32>,
}

impl RightAltHotkeyRecognizer {
    pub fn new() -> Self {
        Self {
            bindings: default_hotkey_bindings(),
            ..Self::default()
        }
    }

    pub fn handle_event(&mut self, event: KeyEvent) -> Option<HotkeyAction> {
        self.handle_hook_event(event).action
    }

    pub fn is_right_alt_down(&self) -> bool {
        self.is_key_pressed(RIGHT_ALT_KEY_CODE)
    }

    pub fn pending_generation(&self) -> Option<u64> {
        self.pending.as_ref().map(|pending| pending.generation)
    }

    pub fn configure_shortcuts(
        &mut self,
        direct: &str,
        process_selection: &str,
        translate: &str,
    ) -> Result<(), String> {
        self.bindings = build_hotkey_bindings(direct, process_selection, translate)?;
        self.pressed_keys.clear();
        self.pending = None;
        self.pending_generation = 0;
        Ok(())
    }

    pub fn handle_hook_event(&mut self, event: KeyEvent) -> HotkeyEventResult {
        match event.transition {
            KeyTransition::Down => self.handle_key_down(event.key_code),
            KeyTransition::Up => self.handle_key_up(event.key_code),
        }
    }

    fn handle_key_down(&mut self, key_code: u32) -> HotkeyEventResult {
        if self.is_key_pressed(key_code) {
            return if self.is_pending_key(key_code) {
                HotkeyEventResult::suppress(None)
            } else {
                HotkeyEventResult::pass_through(None)
            };
        }

        self.pressed_keys.push(key_code);

        if self.pending.is_some() {
            if let Some(binding) = self.match_pressed_binding(key_code) {
                if let Some(pending) = self.pending.as_mut() {
                    pending.action = binding.action;
                    pending.keys = binding.keys;
                    pending.generation = self.pending_generation;
                    pending.help_emitted = false;
                }
                return HotkeyEventResult::suppress(None);
            }
            self.pending = None;
            return HotkeyEventResult::pass_through(None);
        }

        if let Some(binding) = self.match_pressed_binding(key_code) {
            self.pending_generation = self.pending_generation.wrapping_add(1);
            self.pending = Some(PendingHotkey {
                action: binding.action,
                keys: binding.keys,
                generation: self.pending_generation,
                help_emitted: false,
            });
            return HotkeyEventResult::suppress(None);
        }

        HotkeyEventResult::pass_through(None)
    }

    fn handle_key_up(&mut self, key_code: u32) -> HotkeyEventResult {
        let Some(mut pending) = self.pending.take() else {
            self.remove_pressed_key(key_code);
            return HotkeyEventResult::pass_through(None);
        };

        if !shortcut_contains_key(&pending.keys, key_code) {
            self.remove_pressed_key(key_code);
            self.pending = Some(pending);
            return HotkeyEventResult::pass_through(None);
        }

        self.remove_pressed_key(key_code);

        if pending.help_emitted {
            if self.any_shortcut_key_pressed(&pending.keys) {
                self.pending = Some(pending);
                return HotkeyEventResult::suppress(None);
            }
            return HotkeyEventResult::suppress(Some(HotkeyAction::ShortcutHelpDismiss));
        }

        let action = pending.action;
        pending.help_emitted = true;
        HotkeyEventResult::suppress(Some(action))
    }

    pub fn emit_shortcut_help_if_waiting(&mut self) -> Option<HotkeyAction> {
        let Some(pending) = self.pending.as_mut() else {
            return None;
        };

        if pending.help_emitted {
            return None;
        }

        pending.help_emitted = true;
        Some(HotkeyAction::ShortcutHelp)
    }

    fn match_pressed_binding(&self, key_code: u32) -> Option<HotkeyBinding> {
        self.bindings
            .iter()
            .find(|binding| {
                shortcut_contains_key(&binding.keys, key_code)
                    && binding
                        .keys
                        .iter()
                        .all(|key| key.variants.iter().any(|variant| self.is_key_pressed(*variant)))
            })
            .cloned()
    }

    fn is_key_pressed(&self, key_code: u32) -> bool {
        self.pressed_keys.contains(&key_code)
    }

    fn remove_pressed_key(&mut self, key_code: u32) {
        self.pressed_keys.retain(|pressed| *pressed != key_code);
    }

    fn is_pending_key(&self, key_code: u32) -> bool {
        self.pending
            .as_ref()
            .is_some_and(|pending| shortcut_contains_key(&pending.keys, key_code))
    }

    fn any_shortcut_key_pressed(&self, keys: &[ShortcutKey]) -> bool {
        keys.iter()
            .any(|key| key.variants.iter().any(|variant| self.is_key_pressed(*variant)))
    }
}

fn default_hotkey_bindings() -> Vec<HotkeyBinding> {
    build_hotkey_bindings("RightAlt", "RightAlt+Space", "RightAlt+RightShift")
        .expect("default hotkeys must parse")
}

fn build_hotkey_bindings(
    direct: &str,
    process_selection: &str,
    translate: &str,
) -> Result<Vec<HotkeyBinding>, String> {
    Ok(vec![
        HotkeyBinding {
            action: HotkeyAction::ToggleDirect,
            keys: parse_accelerator(direct)?,
        },
        HotkeyBinding {
            action: HotkeyAction::ProcessSelection,
            keys: parse_accelerator(process_selection)?,
        },
        HotkeyBinding {
            action: HotkeyAction::TranslateDictation,
            keys: parse_accelerator(translate)?,
        },
    ])
}

fn parse_accelerator(accelerator: &str) -> Result<Vec<ShortcutKey>, String> {
    let keys = accelerator
        .split('+')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(parse_accelerator_part)
        .collect::<Result<Vec<_>, _>>()?;

    if keys.is_empty() {
        return Err("shortcut cannot be empty".to_string());
    }

    Ok(keys)
}

fn parse_accelerator_part(part: &str) -> Result<ShortcutKey, String> {
    let variants = match part {
        "Ctrl" => vec![0xA2, 0xA3],
        "LeftCtrl" => vec![0xA2],
        "RightCtrl" => vec![0xA3],
        "Alt" => vec![0xA4, 0xA5],
        "LeftAlt" => vec![0xA4],
        "RightAlt" | "AltGr" => vec![RIGHT_ALT_KEY_CODE],
        "Shift" => vec![0xA0, RIGHT_SHIFT_KEY_CODE],
        "LeftShift" => vec![0xA0],
        "RightShift" => vec![RIGHT_SHIFT_KEY_CODE],
        "Super" => vec![0x5B, 0x5C],
        "Space" => vec![SPACE_KEY_CODE],
        "-" => vec![0xBD],
        "=" => vec![0xBB],
        "," => vec![0xBC],
        "." => vec![0xBE],
        "/" => vec![0xBF],
        "\\" => vec![0xDC],
        ";" => vec![0xBA],
        "'" => vec![0xDE],
        "[" => vec![0xDB],
        "]" => vec![0xDD],
        "`" => vec![0xC0],
        value if value.len() == 1 => {
            let ch = value.chars().next().expect("one char");
            if ch.is_ascii_alphabetic() {
                vec![ch.to_ascii_uppercase() as u32]
            } else if ch.is_ascii_digit() {
                vec![ch as u32]
            } else {
                return Err(format!("unsupported shortcut key: {value}"));
            }
        }
        value => return Err(format!("unsupported shortcut key: {value}")),
    };

    Ok(ShortcutKey { variants })
}

fn shortcut_contains_key(keys: &[ShortcutKey], key_code: u32) -> bool {
    keys.iter()
        .any(|key| key.variants.iter().any(|variant| *variant == key_code))
}

pub struct KeyboardHookDispatcher<OnAction>
where
    OnAction: FnMut(HotkeyAction),
{
    recognizer: RightAltHotkeyRecognizer,
    on_action: OnAction,
}

impl<OnAction> KeyboardHookDispatcher<OnAction>
where
    OnAction: FnMut(HotkeyAction),
{
    pub fn new(on_action: OnAction) -> Self {
        Self {
            recognizer: RightAltHotkeyRecognizer::new(),
            on_action,
        }
    }

    pub fn handle_key_event(&mut self, event: KeyEvent) {
        if let Some(action) = self.recognizer.handle_event(event) {
            (self.on_action)(action);
        }
    }
}

/// Opaque handle returned by [`install_hook`]. On Windows it owns the hook
/// thread and the pump thread; on other platforms it is never constructed.
pub struct HookHandle {
    #[cfg(windows)]
    inner: hook_windows::WindowsHookHandle,
}

/// Install a global low-level keyboard hook that forwards recognized
/// Right ALT hotkey actions to `on_action`.
///
/// Returns `UnsupportedPlatform` on non-Windows targets.
#[cfg(windows)]
pub fn install_hook<F>(on_action: F) -> NativeHelperResult<HookHandle>
where
    F: Fn(HotkeyAction) + Send + 'static,
{
    ensure_supported_platform()?;
    hook_windows::install(on_action)
        .map(|inner| HookHandle { inner })
        .map_err(NativeHelperError::InputUnavailable)
}

#[cfg(not(windows))]
pub fn install_hook<F>(_on_action: F) -> NativeHelperResult<HookHandle>
where
    F: Fn(HotkeyAction) + Send + 'static,
{
    Err(NativeHelperError::UnsupportedPlatform)
}

#[cfg(windows)]
pub fn uninstall_hook(handle: HookHandle) -> NativeHelperResult<()> {
    hook_windows::uninstall(handle.inner).map_err(NativeHelperError::InputUnavailable)
}

#[cfg(not(windows))]
pub fn uninstall_hook(_handle: HookHandle) -> NativeHelperResult<()> {
    Err(NativeHelperError::UnsupportedPlatform)
}

#[cfg(windows)]
pub fn configure_hook_shortcuts(
    direct: &str,
    process_selection: &str,
    translate: &str,
) -> NativeHelperResult<()> {
    ensure_supported_platform()?;
    hook_windows::configure_shortcuts(direct, process_selection, translate)
        .map_err(NativeHelperError::InputUnavailable)
}

#[cfg(not(windows))]
pub fn configure_hook_shortcuts(
    _direct: &str,
    _process_selection: &str,
    _translate: &str,
) -> NativeHelperResult<()> {
    Err(NativeHelperError::UnsupportedPlatform)
}

/// Kept for backward compatibility with the previous placeholder API.
pub fn install_keyboard_hook() -> NativeHelperResult<()> {
    ensure_supported_platform()
}

pub fn map_right_alt_combo(
    right_alt: bool,
    space: bool,
    right_shift: bool,
) -> Option<HotkeyAction> {
    if !right_alt {
        return None;
    }

    if space {
        return Some(HotkeyAction::ProcessSelection);
    }

    if right_shift {
        return Some(HotkeyAction::TranslateDictation);
    }

    Some(HotkeyAction::ToggleDirect)
}

#[cfg(test)]
mod tests {
    use super::{
        map_right_alt_combo, HotkeyAction, HotkeyEventResult, KeyEvent, KeyTransition,
        KeyboardHookDispatcher, RightAltHotkeyRecognizer, RIGHT_ALT_KEY_CODE, RIGHT_SHIFT_KEY_CODE,
        SPACE_KEY_CODE,
    };

    #[test]
    fn maps_right_alt_combinations_to_voice_actions() {
        assert_eq!(
            map_right_alt_combo(true, false, false),
            Some(HotkeyAction::ToggleDirect)
        );
        assert_eq!(
            map_right_alt_combo(true, true, false),
            Some(HotkeyAction::ProcessSelection)
        );
        assert_eq!(
            map_right_alt_combo(true, false, true),
            Some(HotkeyAction::TranslateDictation)
        );
        assert_eq!(map_right_alt_combo(false, true, true), None);
    }

    #[test]
    fn emits_direct_toggle_on_right_alt_tap_release() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        assert_eq!(
            recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            Some(HotkeyAction::ToggleDirect)
        );
    }

    #[test]
    fn emits_process_selection_when_space_is_released_while_right_alt_is_down() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        assert_eq!(
            recognizer.handle_event(KeyEvent::down(SPACE_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(SPACE_KEY_CODE)),
            Some(HotkeyAction::ProcessSelection)
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            None
        );
    }

    #[test]
    fn emits_translate_when_right_shift_is_released_while_right_alt_is_down() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        assert_eq!(
            recognizer.handle_event(KeyEvent::down(RIGHT_SHIFT_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_SHIFT_KEY_CODE)),
            Some(HotkeyAction::TranslateDictation)
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            None
        );
    }

    #[test]
    fn ignores_repeated_secondary_key_down_events_while_combo_is_pending() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        assert_eq!(
            recognizer.handle_event(KeyEvent::down(SPACE_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::down(SPACE_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(SPACE_KEY_CODE)),
            Some(HotkeyAction::ProcessSelection)
        );
    }

    #[test]
    fn emits_shortcut_help_when_right_alt_hold_timeout_fires() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        assert_eq!(
            recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.emit_shortcut_help_if_waiting(),
            Some(HotkeyAction::ShortcutHelp)
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            Some(HotkeyAction::ShortcutHelpDismiss)
        );
    }

    #[test]
    fn ignores_shortcut_help_timeout_after_combo_action() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        assert_eq!(
            recognizer.handle_event(KeyEvent::down(SPACE_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(SPACE_KEY_CODE)),
            Some(HotkeyAction::ProcessSelection)
        );

        assert_eq!(recognizer.emit_shortcut_help_if_waiting(), None);
    }

    #[test]
    fn emits_shortcut_help_for_held_process_selection_combo() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        assert_eq!(recognizer.handle_event(KeyEvent::down(SPACE_KEY_CODE)), None);
        assert_eq!(
            recognizer.emit_shortcut_help_if_waiting(),
            Some(HotkeyAction::ShortcutHelp)
        );
        assert_eq!(recognizer.handle_event(KeyEvent::up(SPACE_KEY_CODE)), None);
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            Some(HotkeyAction::ShortcutHelpDismiss)
        );
    }

    #[test]
    fn emits_shortcut_help_for_held_translate_combo() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        assert_eq!(
            recognizer.handle_event(KeyEvent::down(RIGHT_SHIFT_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.emit_shortcut_help_if_waiting(),
            Some(HotkeyAction::ShortcutHelp)
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_SHIFT_KEY_CODE)),
            None
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            Some(HotkeyAction::ShortcutHelpDismiss)
        );
    }

    #[test]
    fn emits_shortcut_help_dismiss_when_single_key_help_is_released() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        assert_eq!(
            recognizer.emit_shortcut_help_if_waiting(),
            Some(HotkeyAction::ShortcutHelp)
        );
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            Some(HotkeyAction::ShortcutHelpDismiss)
        );
    }

    #[test]
    fn key_event_helpers_preserve_code_and_transition() {
        assert_eq!(
            KeyEvent::down(SPACE_KEY_CODE),
            KeyEvent {
                key_code: SPACE_KEY_CODE,
                transition: KeyTransition::Down
            }
        );
    }

    #[test]
    fn hook_dispatcher_forwards_recognized_actions_to_callback() {
        let mut actions = Vec::new();
        let mut dispatcher = KeyboardHookDispatcher::new(|action| actions.push(action));

        dispatcher.handle_key_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        dispatcher.handle_key_event(KeyEvent::down(SPACE_KEY_CODE));
        dispatcher.handle_key_event(KeyEvent::up(SPACE_KEY_CODE));
        dispatcher.handle_key_event(KeyEvent::up(RIGHT_ALT_KEY_CODE));

        assert_eq!(actions, vec![HotkeyAction::ProcessSelection]);
    }

    #[test]
    fn hook_dispatcher_keeps_state_across_events() {
        let mut actions = Vec::new();
        let mut dispatcher = KeyboardHookDispatcher::new(|action| actions.push(action));

        dispatcher.handle_key_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        dispatcher.handle_key_event(KeyEvent::up(RIGHT_ALT_KEY_CODE));
        dispatcher.handle_key_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        dispatcher.handle_key_event(KeyEvent::down(RIGHT_SHIFT_KEY_CODE));
        dispatcher.handle_key_event(KeyEvent::up(RIGHT_SHIFT_KEY_CODE));

        assert_eq!(
            actions,
            vec![HotkeyAction::ToggleDirect, HotkeyAction::TranslateDictation]
        );
    }

    #[test]
    fn hook_result_suppresses_right_alt_tap_sequence() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::down(RIGHT_ALT_KEY_CODE)),
            HotkeyEventResult {
                action: None,
                suppress: true
            }
        );
        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            HotkeyEventResult {
                action: Some(HotkeyAction::ToggleDirect),
                suppress: true
            }
        );
    }

    #[test]
    fn hook_result_suppresses_process_selection_sequence() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::down(RIGHT_ALT_KEY_CODE)),
            HotkeyEventResult {
                action: None,
                suppress: true
            }
        );
        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::down(SPACE_KEY_CODE)),
            HotkeyEventResult {
                action: None,
                suppress: true
            }
        );
        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::up(SPACE_KEY_CODE)),
            HotkeyEventResult {
                action: Some(HotkeyAction::ProcessSelection),
                suppress: true
            }
        );
        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            HotkeyEventResult {
                action: None,
                suppress: false
            }
        );
    }

    #[test]
    fn hook_result_suppresses_secondary_key_up_after_right_alt_releases_first() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_hook_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        recognizer.handle_hook_event(KeyEvent::down(SPACE_KEY_CODE));
        recognizer.handle_hook_event(KeyEvent::up(RIGHT_ALT_KEY_CODE));

        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::up(SPACE_KEY_CODE)),
            HotkeyEventResult {
                action: None,
                suppress: false
            }
        );
    }

    #[test]
    fn hook_result_passes_unrelated_key_without_right_alt_prefix() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::down(0x41)),
            HotkeyEventResult {
                action: None,
                suppress: false
            }
        );
    }

    #[test]
    fn hook_result_does_not_emit_direct_after_unrecognized_key_while_right_alt_is_down() {
        let mut recognizer = RightAltHotkeyRecognizer::new();

        recognizer.handle_hook_event(KeyEvent::down(RIGHT_ALT_KEY_CODE));
        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::down(0x41)),
            HotkeyEventResult {
                action: None,
                suppress: false
            }
        );
        assert_eq!(
            recognizer.handle_hook_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)),
            HotkeyEventResult {
                action: None,
                suppress: false
            }
        );
    }

    #[test]
    fn uses_configured_shortcuts_instead_of_default_right_alt_bindings() {
        let mut recognizer = RightAltHotkeyRecognizer::new();
        recognizer
            .configure_shortcuts("A", "Ctrl+Space", "Shift+T")
            .expect("custom shortcuts parse");

        assert_eq!(recognizer.handle_event(KeyEvent::down(RIGHT_ALT_KEY_CODE)), None);
        assert_eq!(recognizer.handle_event(KeyEvent::up(RIGHT_ALT_KEY_CODE)), None);

        assert_eq!(recognizer.handle_event(KeyEvent::down(0xA2)), None);
        assert_eq!(recognizer.handle_event(KeyEvent::down(SPACE_KEY_CODE)), None);
        assert_eq!(
            recognizer.handle_event(KeyEvent::up(SPACE_KEY_CODE)),
            Some(HotkeyAction::ProcessSelection)
        );
    }
}
