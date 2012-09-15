const St = imports.gi.St;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const Lang = imports.lang;

//Added Version 5

const ExtensionNotificationSource = new Lang.Class({
    Name: 'ExtensionNotificationSource',
    Extends: MessageTray.Source,

    _init: function() {
        this.parent(_("Extension"));
        this._setSummaryIcon(this.createNotificationIcon());
    },

    createNotificationIcon: function() {
        return new St.Icon({ icon_name: 'dialog-warning',
                             icon_type: St.IconType.SYMBOLIC,
                             icon_size: this.ICON_SIZE });
    }
});

function notifyError(msg, details) {
    log('error: ' + msg + ': ' + details);
    notify(msg, details);
}

function notify(msg, details) {
    let source = new ExtensionNotificationSource();
    Main.messageTray.add(source);
    let notification = new MessageTray.Notification(source, msg, details);
    source.notify(notification);
}

