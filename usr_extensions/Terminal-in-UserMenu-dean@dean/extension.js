
const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;

let button, menu;


function init(metadata) {
    menu = Main.panel._statusArea.userMenu.menu;
}

function _buttonActivate() {
    Main.overview.hide();
    let app = Shell.AppSystem.get_default().lookup_app('gnome-terminal.desktop');
    app.activate();
}

function enable() {
    button = new PopupMenu.PopupMenuItem("Terminal");
    button.connect('activate', Lang.bind(button, _buttonActivate));
    menu.addMenuItem(button, 5);
}

function disable() {
    if (button) {
        button.destroy();
    }
}

