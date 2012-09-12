const GdkPixbuf = imports.gi.GdkPixbuf;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const St = imports.gi.St;
const Lang = imports.lang;
const Gettext = imports.gettext.domain('nls1729-extensions');
const _ = Gettext.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Keys = Me.imports.keys;
const Readme = Me.imports.readme;

const _N = function(x) { return x; }

const TXT_INSTS = _N("New Text");
const HPAD_TEXT = _N("Text Padding");
const HIDE_TEXT = _N("Hide Text");
const ICO_INSTS = _N("Select Icon");
const HPAD_ICON = _N("Icon Padding");
const HIDE_ICON = _N("Hide Icon");
const SETS_HOTC = _N("Hot Corner Sensitivity");
const NADA_HOTC = _N("Disable Hot Corner");
const RMV_ACTIV = _N("Remove Activities Button");
const TRANS_PAN = _N("Transparent Panel");
const RST_INSTS = _N("Extension Defaults");
const RME_INSTS = _N("Extension Description");
const APPLY  = _N("APPLY");
const SELECT = _N("SELECT");
const RESET  = _N("RESET");
const README = _N("README");
const TITLE = _N("Choose Icon");
const DEFAULT_ICO = Me.path + '/face-smile-3.svg'; // From Tango Project - Public Domain

function init() {
    Convenience.initTranslations();
}

const ActivitiesConfiguratorSettingsWidget = new GObject.Class({
    Name: 'ActivitiesConfigurator.Prefs.ActivitiesConfiguratorSettingsWidget',
    GTypeName: 'ActivitiesConfiguratorSettingsWidget',
    Extends: Gtk.Grid,

    _init: function(params) {	
        this.parent(params);
        this.margin = this.row_spacing = this.column_spacing = 10;
	this._settings = Convenience.getSettings();
        this.scollingWindow = new Gtk.ScrolledWindow({'hscrollbar-policy': Gtk.PolicyType.AUTOMATIC,
                                                      'vscrollbar-policy': Gtk.PolicyType.AUTOMATIC,
                                                      'hexpand': true, 'vexpand': true});
        this.attach(new Gtk.Label({ label: _(TXT_INSTS), wrap: true, xalign: 0.0 }), 0,  0, 1, 1);
        this.attach(new Gtk.Label({ label: _(HPAD_TEXT), wrap: true, xalign: 0.0 }), 0,  2, 3, 1);
        this.attach(new Gtk.Label({ label: _(HIDE_TEXT), wrap: true, xalign: 0.0 }), 0,  4, 3, 1);
        this.attach(new Gtk.Label({ label: _(ICO_INSTS), wrap: true, xalign: 0.0 }), 0,  6, 3, 1);
        this.attach(new Gtk.Label({ label: _(HPAD_ICON), wrap: true, xalign: 0.0 }), 0,  8, 3, 1);
        this.attach(new Gtk.Label({ label: _(HIDE_ICON), wrap: true, xalign: 0.0 }), 0, 10, 3, 1);
        this.attach(new Gtk.Label({ label: _(SETS_HOTC), wrap: true, xalign: 0.0 }), 0, 12, 3, 1);
        this.attach(new Gtk.Label({ label: _(NADA_HOTC), wrap: true, xalign: 0.0 }), 0, 14, 3, 1);
        this.attach(new Gtk.Label({ label: _(RMV_ACTIV), wrap: true, xalign: 0.0 }), 0, 16, 3, 1);
        this.attach(new Gtk.Label({ label: _(TRANS_PAN), wrap: true, xalign: 0.0 }), 0, 18, 3, 1);
        this.attach(new Gtk.Label({ label: _(RST_INSTS), wrap: true, xalign: 0.0 }), 0, 20, 4, 1);
        this.attach(new Gtk.Label({ label: _(RME_INSTS), wrap: true, xalign: 0.0 }), 0, 22, 4, 1);
        let applyBtn = new Gtk.Button({ label: _(APPLY) });
        this.attach(applyBtn, 4, 0, 1, 1);
        this._entry = new Gtk.Entry({ hexpand: true });
        this.attach(this._entry, 1, 0, 3, 1);
        applyBtn.connect('clicked', Lang.bind(this, this._setActivitiesText));
        this._hpadText = new Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 15, 1);
        this._hpadText.set_value(this._settings.get_int(Keys.PAD_TXT));
        this._hpadText.connect('value-changed', Lang.bind(this, this._onTextPaddingChanged));
        this.attach(this._hpadText, 3, 2, 2, 1);
        this._noText = new Gtk.Switch({active: this._settings.get_boolean(Keys.NO_TEXT)});
        this.attach(this._noText, 4, 4, 1, 1);
        this._noText.connect('notify::active', Lang.bind(this, this._setNoText));
        this._iconImage = new Gtk.Image();
        this._iconPath = this._settings.get_string(Keys.NEW_ICO) || DEFAULT_ICO;
        this._loadIcon(this._iconPath);
        this.attach(this._iconImage, 3, 6, 1, 1);
        let iconBtn = new Gtk.Button({ label: _(SELECT) });
        this.attach(iconBtn, 4, 6, 1, 1);
        iconBtn.connect('clicked', Lang.bind(this, this._setActivitiesIcon));
        this._hpadIcon = new Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 15, 1);
        this._hpadIcon.set_value(this._settings.get_int(Keys.PAD_ICO));
        this._hpadIcon.connect('value-changed', Lang.bind(this, this._onIconPaddingChanged));
        this.attach(this._hpadIcon, 3, 8, 2, 1);
        this._noIcon = new Gtk.Switch({active: this._settings.get_boolean(Keys.NO_ICON)});
        this.attach(this._noIcon, 4, 10, 1, 1);
        this._noIcon.connect('notify::active', Lang.bind(this, this._setNoIcon));
        this._hotCornerDelay = new Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 750, 25);
        this._hotCornerDelay.set_value(this._settings.get_int(Keys.HOTC_TO));
        this._hotCornerDelay.connect('value-changed', Lang.bind(this, this._onHotCornerDelayChanged));
        this.attach(this._hotCornerDelay, 3, 12, 2, 1);
        this._noHotCorner = new Gtk.Switch({active: this._settings.get_boolean(Keys.NO_HOTC)});
        this.attach(this._noHotCorner, 4, 14, 1, 1);
        this._noHotCorner.connect('notify::active', Lang.bind(this, this._setNoHotCorner));
        this._noActivities = new Gtk.Switch({active: this._settings.get_boolean(Keys.REMOVED)});
        this.attach(this._noActivities, 4, 16, 1, 1);
        this._noActivities.connect('notify::active', Lang.bind(this, this._setNoActivities));
        this._transparentPanel = new Gtk.Switch({active: this._settings.get_boolean(Keys.TRS_PAN)});
        this.attach(this._transparentPanel, 4, 18, 1, 1);
        this._transparentPanel.connect('notify::active', Lang.bind(this, this._setTransparentPanel));
        let defaultsBtn = new Gtk.Button({ label: _(RESET) } );
        this.attach(defaultsBtn, 4, 20, 1, 1);
        defaultsBtn.connect('clicked', Lang.bind(this, this._resetSettings));
        let readmeBtn = new Gtk.Button({ label: _(README) } )
        this.attach(readmeBtn, 4, 22, 1, 1);
        readmeBtn.connect('clicked', Readme.showReadme);
    },

    _setActivitiesText: function() {
        let text = this._entry.get_text();
        if(text != '') {
            this._settings.set_string(Keys.NEW_TXT, text);
            this._entry.set_text('');
        }
    },

    _onTextPaddingChanged : function() {
        this._settings.set_int(Keys.PAD_TXT, this._hpadText.get_value());
    },

    _onIconPaddingChanged : function() {
        this._settings.set_int(Keys.PAD_ICO, this._hpadIcon.get_value());
    },

    _onHotCornerDelayChanged : function() {
        this._settings.set_int(Keys.HOTC_TO, this._hotCornerDelay.get_value());
    },

    _setNoText: function(object) {
        this._settings.set_boolean(Keys.NO_TEXT, object.active);
    },

    _setActivitiesIcon: function() {
        let dialog = new Gtk.FileChooserDialog({ title: _(TITLE), action: Gtk.FileChooserAction.OPEN });
        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
        dialog.add_button(Gtk.STOCK_OPEN, Gtk.ResponseType.ACCEPT);
        dialog.set_filename(this._iconPath);
        let filter = new Gtk.FileFilter();
        filter.set_name(_("Images"));
        filter.add_pattern("*.png");
        filter.add_pattern("*.jpg");
        filter.add_pattern("*.gif");
        filter.add_pattern("*.svg");
        filter.add_pattern("*.ico");
        dialog.add_filter(filter);
        let response = dialog.run();
        if(response == -3) {
            let filename = dialog.get_filename()
            if(filename != this._iconPath) {
                this._iconPath = filename;
                this._loadIcon(filename);
                this._settings.set_string(Keys.NEW_ICO, filename);
            }
        }
        dialog.destroy();
    },

    _setNoIcon: function(object) {
        this._settings.set_boolean(Keys.NO_ICON, object.active);
    },

    _setNoHotCorner: function(object) {
        this._settings.set_boolean(Keys.NO_HOTC, object.active);
    },

    _setNoActivities: function(object) {
        this._settings.set_boolean(Keys.REMOVED, object.active);
    },

    _setTransparentPanel: function(object) {
        this._settings.set_boolean(Keys.TRS_PAN, object.active);
    },

    _resetSettings: function() {
        this._hpadText.set_value(8);
        this._hpadIcon.set_value(8);
        this._noActivities.set_active(false);
        let default_txt = this._settings.get_string(Keys.ORI_TXT);
        this._settings.set_string(Keys.NEW_TXT, default_txt);
        this._noText.set_active(false);
        this._settings.set_string(Keys.NEW_ICO, DEFAULT_ICO);
        this._iconPath = DEFAULT_ICO;
        this._loadIcon(this._iconPath);
        this._noIcon.set_active(false);
        this._hotCornerDelay.set_value(250);
        this._noHotCorner.set_active(false);
        this._transparentPanel.set_active(false);
    },

    _loadIcon: function(path) {
        let pixbuf = new GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 32, 32, null);
        this._iconImage.set_from_pixbuf(pixbuf);
    }
});

function buildPrefsWidget() {    
    let widget = new ActivitiesConfiguratorSettingsWidget();
    // Put widget in scroller for small screens (Version 4)
    widget.scollingWindow.add_with_viewport(widget);
    widget.scollingWindow.show_all();
    return widget.scollingWindow;
}
