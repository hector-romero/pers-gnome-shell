/*
    Copyright (C) 2012 Fabio Castelli <muflone@vbsimple.net>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

    This work uses portions of the following GPL covered projects:
    -  Extended Volume Indicator by tigersoldier
       https://extensions.gnome.org/extension/142/output-device-chooser-on-volume-menu/
    -  Media player indicator by eon
       https://extensions.gnome.org/extension/55/media-player-indicator/
*/

const Gtk = imports.gi.Gtk;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Util = Extension.imports.util;
const Gettext = imports.gettext.domain(Util.GETTEXT_DOMAIN);
const _ = Gettext.gettext;

let settings_bool = null;

function init() {
    Util.initTranslations('');
    settings_bool = {
        'debug': {label: _('Enable debug output') },
        'unmute-active-device': {label: _('Unmute the active device') }
    };
}

function createBoolSetting(setting) {
    // Add a new switch widget for a boolean setting
    let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

    let setting_label = new Gtk.Label({label: settings_bool[setting].label,
                                       xalign: 0 });

    let setting_switch = new Gtk.Switch({active: Util.settings.get_boolean(setting)});
    setting_switch.connect('notify::active', function(button) {
        Util.settings.set_boolean(setting, button.active);
    });

    if (settings_bool[setting].help) {
        setting_label.set_tooltip_text(settings_bool[setting].help)
        setting_switch.set_tooltip_text(settings_bool[setting].help)
    }

    hbox.pack_start(setting_label, true, true, 0);
    hbox.add(setting_switch);

    return hbox;
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                              border_width: 10 });
    let vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                             margin: 20, margin_top: 10 });

    for (setting in settings_bool) {
        let hbox = createBoolSetting(setting);
        vbox.add(hbox);
    }

    frame.add(vbox);
    frame.show_all();
    return frame;
}
