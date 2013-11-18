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

const Lang = imports.lang;
const Gvc = imports.gi.Gvc;
const Signals = imports.signals;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Util = Extension.imports.util;

const PA_INVALID_INDEX = 0xffffffff; // ((uint32_t) -1)

let indicator = null; // Volume indicator in status area
let outputDevices = null; // Output devices lister

function OutputDevices(indicator) {
    this._init(indicator);
}

OutputDevices.prototype = {
    _init: function(indicator) {
        this._writeDebugLog('_init() BEGIN');
        // Volume indicator
        this._indicator = indicator;
        // Signal handler for when a new device was added?
        this._addOutputId = indicator._control.connect('stream-added',
            Lang.bind(this, this._addSink));
        // Signal handler for when a device was removed?
        this._removeOutputId = indicator._control.connect('stream-removed',
            Lang.bind(this, this._removeSink));
        // Signal handler for when the default sink was changed
        this._defaultChangeId = indicator._control.connect('default-sink-changed',
            Lang.bind(this, this._setDefault));
        // Set current sink to an invalid id
        this._outputId = PA_INVALID_INDEX;
        this._outputMenus = {};
        this._outputCount = 0;
        if (this._indicator._control.get_state() == Gvc.MixerControlState.READY) {
            // Save the default sink
            let defaultOutput = this._indicator._control.get_default_sink();
            if (defaultOutput)
                this._outputId = defaultOutput.id;
            // Loop over each sink
            let sinks = this._indicator._control.get_sinks();
            for (let i = 0; i < sinks.length; i++) {
                // Try to add the sink to the volume menu
                this._addSink(indicator._control, sinks[i].id);
            }
        }
        this._writeDebugLog('_init() END');
    },

    // Try to add a new sink in the volume menu
    _addSink: function(control, id) {
        this._writeDebugLog('_addSink(' + id + ')');
        // The device already exists in the menu?
        if (id in this._outputMenus)
            return;
        let stream = control.lookup_stream_id(id);
        // Is the stream a MixerSync?
        if (stream instanceof Gvc.MixerSink) {
            // Create a new menu item for the sink
            let menu = new PopupMenu.PopupSwitchMenuItem(stream.description,
                !stream.is_muted);
            // When the menu item is activated the default sink have to
            // be changed
            menu.connect('activate', Lang.bind(this, function (menuItem, event) {
                if (stream.id != this._outputId) {
                    control.set_default_sink(stream);
                    // Unmute the active device if set in preferences
                    if (Util.settings.get_boolean('unmute-active-device')) {
                        stream.change_is_muted(false);
                        menuItem.setToggleState(true);
                    }
                }
            }));
            
            // When the state is toggled (un)mute the stream
            menu.connect('toggled', Lang.bind(this, function (menuItem, state) {
                this._setMute(control, id, state);
            }));
            // When the stream is (un)muted change the menu item state
            stream.connect('notify::is-muted',
                Lang.bind(this, this._notifyIsMuted));

            // Relative base position in the volume menu
            let outputOffset = 2;
            // Create the new menu item
            this._indicator.menu.addMenuItem(menu, outputOffset + this._outputCount);
            this._outputMenus[id] = menu;
            this._outputCount++;
            if (this._outputId == stream.id)
                menu.setShowDot(true);
        }
    },

    // Try to remove a sink from the volume menu
    _removeSink: function(control, id) {
        this._writeDebugLog('_removeSink(' + id + ')');
        if (id in this._outputMenus) {
            this._outputMenus[id].destroy();
            delete this._outputMenus[id];
            this._outputCount--;
            if (this._outputCount == 1) {
                for (let k in this._outputMenus) {
                    this._outputMenus[k].actor.hide();
                }
            }
        }
    },

    // Set the default sink in the volume menu
    _setDefault: function(control, id) {
        this._writeDebugLog('_setDefault(' + id + ')');
        // Set default sink
        if (this._outputId != id) {
            // Disable previous default active menu item
            this._setMenuDots(this._outputId, false);
            // Enable the new default active menu item
            this._setMenuDots(id, true);
            // Set default id device
            this._outputId = id;
        }
    },

    // Update menu when a sink is (un)muted
    _notifyIsMuted: function(stream) {
        this._writeDebugLog('_notifyIsMuted(' + stream.id + ')');
        this._outputMenus[stream.id].setToggleState(!stream.is_muted);
    },
    
    // Try to (un)mute the sink
    _setMute: function(control, id, value) {
        this._writeDebugLog('_setMute(' + id + ', ' + value + ')');
        let stream = control.lookup_stream_id(id);
        // Is the stream a MixerSync?
        if (stream instanceof Gvc.MixerSink)
            stream.change_is_muted(!stream.is_muted);
    },

    // Set the dot state on a menu item
    _setMenuDots: function(id, value) {
        if (id in this._outputMenus)
            this._outputMenus[id].setShowDot(value);
    },
    
    // Write a log line if debug is enabled
    _writeDebugLog: function(text) {
        if (Util.settings.get_boolean('debug'))
            global.log(Util.EXTENSION_NAME + ': ' + text);
    },

    destroy: function() {
        this._writeDebugLog('destroy() BEGIN');
        // Remove all sinks from the menu
        for (let sink in this._outputMenus) {
            this._removeSink(null, sink);
        }
        // Empty menus
        this._outputMenus = {};
        this._outputCount = 0;
        // Disconnect all signal handlers
        this._indicator._control.disconnect(this._addOutputId);
        this._indicator._control.disconnect(this._removeOutputId);
        this._indicator._control.disconnect(this._defaultChangeId);
        this.emit('destroy');
        this._writeDebugLog('destroy() END');
    }
};

Signals.addSignalMethods(OutputDevices.prototype);

function init() {
}

function main() {
}

function enable() {
    if (Main.panel.statusArea['volume'] && !outputDevices)
        outputDevices = new OutputDevices(Main.panel.statusArea['volume']);
}

function disable() {
    if (outputDevices) {
        outputDevices.destroy();
        outputDevices = null;
    }
}
