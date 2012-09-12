/* -*- mode: js2 - indent-tabs-mode: nil - js2-basic-offset: 4 -*- */
/* This extension is a derived work of the Gnome Shell.
*
* Copyright (c) 2012 Norman L. Smith
*
* This extension is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 2 of the License, or
* (at your option) any later version.
*
* This extension is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this extension; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
*/

const Atk = imports.gi.Atk;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const DND = imports.ui.dnd;
const Layout = imports.ui.layout;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Gettext = imports.gettext.domain('nls1729-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Keys = Me.imports.keys;

const HotterCorner = new Lang.Class({
    Name: 'ActivitiesConfigurator.HotterCorner',
    Extends: Layout.HotCorner,

    _init: function() {
        this.parent(0.0);
        this._delay = 0;
    },

    destroy: function() {
        this.actor.destroy();
        this.parent();
    },

    _onCornerEntered : function() {
        if (!this._entered) {
            this._entered = true;
            if (!Main.overview.animationInProgress) {
                if (this._delay > 0) {
                    Mainloop.timeout_add(this._delay, Lang.bind(this, this._toggleTimeout));
                } else {
                    this._toggleTimeout();
                }
            }
        }
        return false;
    },

    _toggleTimeout: function() {
        if (this._entered) {
            this._activationTime = Date.now() / 1000;
            this.rippleAnimation();
            Main.overview.toggle();
        }
        return false;
    }
});

const ActivitiesIconButton = new Lang.Class({
    Name: 'ActivitiesConfigurator.ActivitiesIconButton',
    Extends: PanelMenu.Button,

    _init: function() {
        this.parent(0.0);
        this._position = 0;
        this.actor.accessible_role = Atk.Role.TOGGLE_BUTTON;
        this._signals = [];
        this._container = new Shell.GenericContainer();
        this._signals[0] = this._container.connect('get-preferred-width', Lang.bind(this, this._containerGetPreferredWidth));
        this._signals[1] = this._container.connect('get-preferred-height', Lang.bind(this, this._containerGetPreferredHeight));
        this._signals[2] = this._container.connect('allocate', Lang.bind(this, this._containerAllocate));
        this.actor.add_actor(this._container);
        this.actor.name = 'panelActivitiesIconButton';
        this._iconLabelBox = new St.BoxLayout();
        this._iconBin = new St.Bin();
        this._textBin = new St.Bin();
        this._iconLabelBox.add(this._iconBin);
        this._label = new St.Label();
        this._textBin.child = this._label;
        this._iconLabelBox.add(this._textBin);
        this._container.add_actor(this._iconLabelBox);
        this._hotCorner = new HotterCorner();
        this._container.add_actor(this._hotCorner.actor);
        this.menu.open = Lang.bind(this, this._onMenuOpenRequest);
        this.menu.close = Lang.bind(this, this._onMenuCloseRequest);
        this.menu.toggle = Lang.bind(this, this._onMenuToggleRequest);
        this._signals[3] = this.actor.connect('captured-event', Lang.bind(this, this._onCapturedEvent));
        this._signals[4] = this.actor.connect_after('button-release-event', Lang.bind(this, this._onButtonRelease));
        this._signals[5] = this.actor.connect_after('key-release-event', Lang.bind(this, this._onKeyRelease));
        this._signals[6] = this.actor.connect('style-changed', Lang.bind(this, this._onStyleChanged));
        this._minHPadding = this._natHPadding = 0.0;
        this._signals[7] = Main.overview.connect('showing', Lang.bind(this, this._overviewShowing));
        this._signals[8] = Main.overview.connect('hiding', Lang.bind(this, this._overviewHiding));
        this._xdndTimeOut = 0;
    },

    _onStyleChanged: function(actor) {
        this._minHPadding = this._natHPadding = 0.0;
    },

    _overviewShowing: function() {
        this.actor.add_style_pseudo_class('overview');
        this._escapeMenuGrab();
        this.actor.add_accessible_state(Atk.StateType.CHECKED);
    },

    _overviewHiding: function() {
        this.actor.remove_style_pseudo_class('overview');
        this._escapeMenuGrab();
        this.actor.remove_accessible_state(Atk.StateType.CHECKED);
    },

    _containerGetPreferredWidth: function(actor, forHeight, alloc) {
        [alloc.min_size, alloc.natural_size] = this._iconLabelBox.get_preferred_width(forHeight);
    },

    _containerGetPreferredHeight: function(actor, forWidth, alloc) {
        [alloc.min_size, alloc.natural_size] = this._iconLabelBox.get_preferred_height(forWidth);
    },

    _containerAllocate: function(actor, box, flags) {
        this._iconLabelBox.allocate(box, flags);
        let primary = Main.layoutManager.primaryMonitor;
        let hotBox = new Clutter.ActorBox();
        let ok, x, y;
        if (actor.get_text_direction() == Clutter.TextDirection.LTR)
            [ok, x, y] = actor.transform_stage_point(primary.x, primary.y);
        else
            [ok, x, y] = actor.transform_stage_point(primary.x + primary.width, primary.y);
        hotBox.x1 = Math.round(x);
        hotBox.x2 = hotBox.x1 + this._hotCorner.actor.width;
        hotBox.y1 = Math.round(y);
        hotBox.y2 = hotBox.y1 + this._hotCorner.actor.height;
        this._hotCorner.actor.allocate(hotBox, flags);
    },

    handleDragOver: function(source, actor, x, y, time) {
        if (source != Main.xdndHandler)
            return DND.DragMotionResult.CONTINUE;
        if (this._xdndTimeOut != 0)
            Mainloop.source_remove(this._xdndTimeOut);
        this._xdndTimeOut = Mainloop.timeout_add(BUTTON_DND_ACTIVATION_TIMEOUT,
                                                 Lang.bind(this, this._xdndShowOverview, actor));
        return DND.DragMotionResult.CONTINUE;
    },

    _escapeMenuGrab: function() {
        if (this.menu.isOpen)
            this.menu.close();
    },

    _onCapturedEvent: function(actor, event) {
        if (event.type() == Clutter.EventType.BUTTON_PRESS) {
            if (!this._hotCorner.shouldToggleOverviewOnClick())
                return true;
        }
        return false;
    },

    _onMenuOpenRequest: function() {
        this.menu.isOpen = true;
        this.menu.emit('open-state-changed', true);
    },

    _onMenuCloseRequest: function() {
        this.menu.isOpen = false;
        this.menu.emit('open-state-changed', false);
    },

    _onMenuToggleRequest: function() {
        this.menu.isOpen = !this.menu.isOpen;
        this.menu.emit('open-state-changed', this.menu.isOpen);
    },

    _onButtonRelease: function() {
        if (this.menu.isOpen) {
            this.menu.close();
            Main.overview.toggle();
        }
    },

    _onKeyRelease: function(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return || symbol == Clutter.KEY_space) {
            if (this.menu.isOpen)
                this.menu.close();
            Main.overview.toggle();
        }
    },

    _xdndShowOverview: function(actor) {
        let [x, y, mask] = global.get_pointer();
        let pickedActor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
        if (pickedActor == this.actor) {
            if (!Main.overview.visible && !Main.overview.animationInProgress) {
                Main.overview.showTemporarily();
                Main.overview.beginItemDrag(actor);
            }
        }
        Mainloop.source_remove(this._xdndTimeOut);
        this._xdndTimeOut = 0;
    },

    destroy: function() {
        this._container.disconnect(this._signals[0]);
        this._container.disconnect(this._signals[1]);
        this._container.disconnect(this._signals[2]);
        this.actor.disconnect(this._signals[3]);
        this.actor.disconnect(this._signals[4]);
        this.actor.disconnect(this._signals[5]);
        this.actor.disconnect(this._signals[6]);
        Main.overview.disconnect(this._signals[7]);
        Main.overview.disconnect(this._signals[8]);
        this.parent();
    }
});

const Configurator = new Lang.Class({
    Name: 'ActivitiesConfigurator.Configurator',

    _init : function() {
        this._settings = Convenience.getSettings();
        this._savedText = Main.panel._activitiesButton._label.get_text();
        this._settings.set_string(Keys.ORI_TXT, this._savedText);
        this._settingsSignals = [];
        this._iconPath = '';
        this._originalOnCornerEntered = null;
    },

    _setIcon: function() {
        let iconPath = this._settings.get_string(Keys.NEW_ICO);
        if(this._iconPath != iconPath) {
            this._activitiesIconButton._iconBin.child = new St.Icon({ gicon: Gio.icon_new_for_string(iconPath) });
            this._activitiesIconButton._iconBin.child.style_class = 'activities-icon';
            this._iconPath = iconPath;
        }
        if(this._settings.get_boolean(Keys.NO_ICON)) {
            this._activitiesIconButton._iconBin.hide();
        } else {
            let pixels = this._settings.get_int(Keys.PAD_ICO);
            let iconStyle = 'icon-size: 1.5em; padding-left: %dpx'.format(pixels);
            this._activitiesIconButton._iconBin.show();
            this._activitiesIconButton._iconBin.child.set_style(iconStyle);
        }
    },

    _setText: function() {
        let labelText = this._settings.get_string(Keys.NEW_TXT) || this._savedText;
        if(this._settings.get_boolean(Keys.NO_TEXT))
            labelText = '';
        this._activitiesIconButton._label.text = labelText;
        if(labelText != '') {
            let pixels = this._settings.get_int(Keys.PAD_TXT);
            let textStyle = 'padding-left: %dpx'.format(pixels);
            this._activitiesIconButton._label.set_style(textStyle);
        }
    },

    _setHotCornerTimeOut: function() {
        this._activitiesIconButton._hotCorner._delay = this._settings.get_int(Keys.HOTC_TO);
    },

    _setHotCorner: function() {
        if(this._settings.get_boolean(Keys.NO_HOTC))
            this._activitiesIconButton._hotCorner.actor.hide();
        else
            this._activitiesIconButton._hotCorner.actor.show();
    },

    _insertButton: function(button) {
        Main.panel._leftBox.insert_child_at_index(button.actor, this._position);
        button.actor.show();
    },

    _removeButton: function(button) {
        button.actor.hide();
        Main.panel._leftBox.remove_child(button.actor);
    },

    _setActivities: function() {
        if(this._settings.get_boolean(Keys.REMOVED))
            this._removeButton(this._activitiesIconButton);
        else
            this._insertButton(this._activitiesIconButton);
    },

    _setTransparentPanel: function(transparent) {
        if(transparent) {
            Main.panel.actor.set_style('background-color: transparent');
            Main.panel._leftCorner.actor.set_style('-panel-corner-background-color: transparent');
            Main.panel._rightCorner.actor.set_style('-panel-corner-background-color: transparent');
        } else {
            Main.panel.actor.set_style('');
            Main.panel._leftCorner.actor.set_style('-panel-corner-background-color: black');
            Main.panel._rightCorner.actor.set_style('-panel-corner-background-color: black');
        }
    },

    _setTransparent: function() {
        this._setTransparentPanel(this._settings.get_boolean(Keys.TRS_PAN));
    },

    destroy: function() {
        this._activitiesIconButton.destroy();
        this._activitiesIconButton = null;
    },

    enable: function() {
        this._activitiesIconButton = new ActivitiesIconButton();
        let children = Main.panel._leftBox.get_children();
        for(let i = 0; i< children.length; i++) {
            if(children[i].name == 'panelActivities') {
                this._position = i;
                break;
            }
        }
        this._iconPath = '';
        this._insertButton(this._activitiesIconButton);
        this._removeButton(Main.panel._activitiesButton);
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.REMOVED, Lang.bind(this, this._setActivities)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NEW_TXT, Lang.bind(this, this._setText)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NEW_ICO, Lang.bind(this, this._setIcon)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.HOTC_TO, Lang.bind(this, this._setHotCornerTimeOut)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NO_HOTC, Lang.bind(this, this._setHotCorner)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NO_TEXT, Lang.bind(this, this._setText)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NO_ICON, Lang.bind(this, this._setIcon)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.PAD_TXT, Lang.bind(this, this._setText)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.PAD_ICO, Lang.bind(this, this._setIcon)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.TRS_PAN, Lang.bind(this, this._setTransparent)));
        this._setText();
        this._setHotCornerTimeOut();
        this._setHotCorner();
        if(!this._settings.get_boolean(Keys.NO_ICON))
           this._setIcon();
        this._setActivities();
        this._setTransparent();
    },

    disable: function() {
        this._setTransparentPanel(false);
        for (let i = 0; i < this._settingsSignals.length; i++)
	    this._settings.disconnect(this._settingsSignals[i]);
        this._settingsSignals = [];
        if(!this._settings.get_boolean(Keys.REMOVED))
            this._removeButton(this._activitiesIconButton);
        this._insertButton(Main.panel._activitiesButton);
        this._activitiesIconButton.destroy();
        this._activitiesIconButton = null;
    },
});

function init(metadata) {
    Convenience.initTranslations();
    return new Configurator();
}
