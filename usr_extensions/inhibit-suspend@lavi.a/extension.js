/*
 *	Yet Another Inhibit Suspend Extension for GNOME shell
 *  Copyright (C) 2012 Lavi .A
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *	
 *	Git: https://github.com/lavi741/gnome-shell-extension-inhibit-suspend
 *	Launchpad: https://launchpad.net/inhibit-suspend
 */
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const St = imports.gi.St;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GnomeSession = imports.misc.gnomeSession;
const UserMenu = imports.ui.userMenu;

const Gettext = imports.gettext.domain('gnome-shell-extension-inhibit-suspend');
const _ = Gettext.gettext;

const SessionIface = <interface name='org.gnome.SessionManager'>
<method name='Inhibit'>
  <arg name='app_id' type='s' direction='in'/>
  <arg name='toplevel_xid' type='u' direction='in'/>
  <arg name='reason' type='s' direction='in'/>
  <arg name='flags' type='u' direction='in'/>
  <arg name='inhibit_cookie' type='u' direction='out'/>
</method>
<method name='Uninhibit'>
  <arg name='inhibit_cookie' type='u' direction='in'/>
</method>
</interface>;

let SessionProxy = Gio.DBusProxy.makeProxyWrapper(SessionIface);
let item, userMenu;
let inhibit, sessionProxy;

function init(extensionMeta) {
    imports.gettext.bindtextdomain("gnome-shell-extension-inhibit-suspend", extensionMeta.path + "/locale");
    userMenu = Main.panel.statusArea['userMenu'];
}

function enable() {
    item = new PopupMenu.PopupSwitchMenuItem(_("Inhibit Suspend"), false);
	// Look for the notifications switch instead of coding by number to prevent conflicts.
    let statusMenu = Main.panel.statusArea['userMenu'];
    let children = statusMenu.menu._getMenuItems();
    let index;
	for (let i = 0; i < children.length; i++) {
		if (children[i] == statusMenu._notificationsSwitch) {
			index = i + 1;
			break;
		}
	}
    userMenu.menu.addMenuItem(item, index);

    inhibit = undefined;
    sessionProxy = new SessionProxy(Gio.DBus.session, 'org.gnome.SessionManager', '/org/gnome/SessionManager');
    
    let onInhibit = function(cookie) {
        inhibit = cookie;
    };

    item.connect('toggled', Lang.bind(userMenu, function()
    {
        if(inhibit) {
            sessionProxy.UninhibitRemote(inhibit);
            inhibit = undefined;
        } else {
            try {
                sessionProxy.InhibitRemote("inhibitor", 0, "inhibit mode", 9, Lang.bind(this, onInhibit));
            } catch(e) {
                //
            }
        }
    }));
}

function disable() {
	if (item) {
        item.destroy();
    }
	if(inhibit) {
    	sessionProxy.UninhibitRemote(inhibit);
	}
}
