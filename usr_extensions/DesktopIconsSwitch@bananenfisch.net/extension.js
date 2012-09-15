/*
    Desktop Icons Switch (Version 1), an extension for the gnome-shell.
    (C) 2012 Kurt Fleisch; <http://www.bananenfisch.net/gnome/>
    Gnome Shell Extensions: <https://extensions.gnome.org/>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version. <http://www.gnu.org/licenses/>
*/
const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Gio = imports.gi.Gio;

let item, userMenu, iconSetting, iconStatus;

function init()
{
    userMenu = Main.panel._statusArea.userMenu;
}

function enable()
{
    iconSetting = new Gio.Settings({ schema: "org.gnome.desktop.background" });
    iconStatus = iconSetting.get_boolean("show-desktop-icons");
    
    item = new PopupMenu.PopupSwitchMenuItem(_("Desktop Icons"), iconStatus);
    userMenu.menu.addMenuItem(item, 2);

    item.connect('toggled', Lang.bind(userMenu, function()
    {
        if (iconStatus == true) iconStatus = false;
        else iconStatus = true;
        iconSetting.set_boolean("show-desktop-icons", iconStatus);
    }));
}

function disable()
{
    if (item) {
        item.destroy();
    }
}
