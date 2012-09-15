// Creates a system status notification icon for dropbox
const StatusIconDispatcher = imports.ui.statusIconDispatcher;

function enable() {
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['dropbox'] = 'dropbox';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['skype'] = 'skype';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['vlc'] = 'vlc';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['empathy'] = 'empathy';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['gsd-keyboard-xkb'] = 'gsd-keyboard-xkb';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['gnome-settings-daemon'] = 'gnome-settings-daemon';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['gwibber-service'] = 'gwibber-service';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['google-music-manager'] = 'google-music-manager';

}

function disable() {
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['dropbox'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['skype'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['vlc'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['empathy'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['gsd-keyboard-xkb'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['gnome-settings-daemon'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['gwibber-service'] = '';
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['google-music-manager'] = '';
}


// gnome-shell extension entry point
function init() {
}
