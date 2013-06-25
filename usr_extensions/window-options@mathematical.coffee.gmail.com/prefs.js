/** Credit:
 *  taken from the gnome shell extensions repository at
 *  git.gnome.org/browse/gnome-shell-extensions
 */
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext;
const _ = Gettext.domain('mutter').gettext;
const WO_ = Gettext.gettext; // my additional translations


const LENGTH_CUTOFF_KEY = 'length-cutoff';
const ORDER_KEY = 'order';
// do not translate the following, they are keys into the schema.
const ITEM_KEYS = {
    MINIMIZE: 'minimize',
    RESTORE: 'restore',
    MAXIMIZE: 'maximize',
    MOVE: 'move',
    RESIZE: 'resize',
    RAISE: 'raise',
    LOWER: 'lower',
    NOT_ALWAYS_ON_TOP: 'not-always-on-top',
    ALWAYS_ON_TOP: 'always-on-top',
    ALWAYS_ON_VISIBLE_WORKSPACE: 'always-on-visible-workspace',
    ALWAYS_ON_THIS_WORKSPACE: 'always-on-this-workspace',
    MOVE_TO_WORKSPACE: 'move-to-workspace',
    MOVE_TO_PREVIOUS_WORKSPACE: 'move-to-previous-workspace',
    MOVE_TO_NEXT_WORKSPACE: 'move-to-next-workspace',
    CLOSE_WINDOW: 'close-window',
    SEPARATOR: 'separator'
}
const TOGGLE_KEY_SUFFIX='-is-toggle';
// the following are there for convenience and should not be able to be added
// to the menu.
const DUMMY_KEYS=[ ITEM_KEYS.ALWAYS_ON_THIS_WORKSPACE, ITEM_KEYS.RESTORE, ITEM_KEYS.NOT_ALWAYS_ON_TOP ];

// We use the mutter domain because they have the translations already.
// Do not change any of the following strings or they will not be translated.
// The have underscores in them as the keyboard navigation - I have to put
// them in in order to have my strings translated, but I don't want them in
// the menu so I'll remove them after.
const ITEM_LABELS = {};
ITEM_LABELS[ITEM_KEYS.MINIMIZE] = _("Mi_nimize");
ITEM_LABELS[ITEM_KEYS.RESTORE] = _("Unma_ximize");
ITEM_LABELS[ITEM_KEYS.MAXIMIZE] = _("Ma_ximize");
ITEM_LABELS[ITEM_KEYS.MOVE] = _("_Move");
ITEM_LABELS[ITEM_KEYS.RESIZE] = _("_Resize");
ITEM_LABELS[ITEM_KEYS.LOWER] = WO_("Lower");
ITEM_LABELS[ITEM_KEYS.RAISE] = WO_("Raise");
ITEM_LABELS[ITEM_KEYS.ALWAYS_ON_TOP] = _("Always on _Top");
ITEM_LABELS[ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE] = _("_Always on Visible Workspace");
ITEM_LABELS[ITEM_KEYS.ALWAYS_ON_THIS_WORKSPACE] = _("_Only on This Workspace");
ITEM_LABELS[ITEM_KEYS.MOVE_TO_WORKSPACE] = _("Move to Another _Workspace");
ITEM_LABELS[ITEM_KEYS.MOVE_TO_PREVIOUS_WORKSPACE] = _("Move to Workspace _Up");
ITEM_LABELS[ITEM_KEYS.MOVE_TO_NEXT_WORKSPACE] = _("Move to Workspace _Down");
ITEM_LABELS[ITEM_KEYS.CLOSE_WINDOW] = _("_Close");
ITEM_LABELS[ITEM_KEYS.SEPARATOR] = WO_("Separator");

// remove '_' (keyboard accelerators)
for (let tr in ITEM_LABELS) {
    if (ITEM_LABELS.hasOwnProperty(tr)) {
        ITEM_LABELS[tr] = ITEM_LABELS[tr].replace(/_/g, '');
    }
}

function init() {
    Convenience.initTranslations();
}

function LOG(msg) {
    //log(msg);
}
/*
 * A Gtk.ListStore with the convenience of binding one of the columns to
 * a GSettings strv column.
 *
 * Modified from git.gnome.org/gnome-shell-extensions auto-move-windows prefs.js
 *
 * In particular, 'key' is the strv gsettings key, and 'keyColumnIndex' is the
 * column index we will get the values for this key from.
 */
const ListModel = new GObject.Class({
    Name: 'WindowOptions.ListModel',
    GTypeName: 'ListModel',
    Extends: Gtk.ListStore,

    Columns: {
        KEY: 0,
        LABEL: 1
    },

    _init: function (settings, key, keyColumnIndex, params) {
        this.parent(params);
        this._settings = settings;
        this._strvKey = key;
        this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
        this._keyColumnIndex = keyColumnIndex;
        this._preventChanges = false; // a lock.

        this._reloadFromSettings();

        this.connect('row-changed', Lang.bind(this, this._onRowChanged));
        this.connect('row-inserted', Lang.bind(this, this._onRowInserted));
        this.connect('row-deleted', Lang.bind(this, this._onRowDeleted));

    },

    /* attempt to lock the store, returning TRUE if we succeeded and FALSE
     * if it was already locked
     */
    lock: function () {
        if (this._preventChanges) {
            return false;
        }
        this._preventChanges = true;
        return true;
    },

    /* unlock the store to allow future changes */
    unlock: function () {
        this._preventChanges = false;
    },

    /* query whether the store is locked */
    is_locked: function () {
        return this._preventChanges;
    },

    _reloadFromSettings: function () { // segfault.
        if (this.lock()) {
            let newNames = this._settings.get_strv(this._strvKey);
            let [ok, iter] = this.get_iter_first();
            while (ok) {
                ok = this.remove(iter);
            }

            for (let i = 0; i < newNames.length; i++) {
                iter = this.append();
                this.set(
                    iter,
                    [this.Columns.KEY, this.Columns.LABEL],
                    [newNames[i], ITEM_LABELS[newNames[i]]]);
            }
            this.unlock();
        }
    },

    _onRowChanged: function (self, path, iter) {
        if (this.lock()) {
            LOG('changing row');
            let index = path.get_indices()[0],
                names = this._settings.get_strv(this._strvKey);
            // skip blanks, append to end:
            index = Math.min(index, names.length);
            names[index] = this.get_value(iter, this._keyColumnIndex) || '';
            LOG('changed row: ' + names);

            this._settings.set_strv(this._strvKey, names);
            this.unlock();
        } else {
            LOG('tried to change row but it was locked');
        }
    },

    _onRowInserted: function(self, path, iter) {
        if (this.lock()) {
            LOG('inserting row');
            let index = path.get_indices()[0];
            let names = this._settings.get_strv(this._strvKey);
            let label = this.get_value(iter, this._keyColumnIndex) || '';
            names.splice(index, 0, label);
            LOG('inserted row: ' + names);

            this._settings.set_strv(this._strvKey, names);
            this.unlock();
        } else {
            LOG('tried to insert row but it was locked');
        }
    },

    _onRowDeleted: function(self, path) {
        if (this.lock()) {
            LOG('deleting row');
            let index = path.get_indices()[0];
            let names = this._settings.get_strv(this._strvKey);

            if (index >= names.length) {
                this.unlock();
                return;
            }

            names.splice(index, 1);
            names = names.filter(function (w) { return w; });
            LOG('deleted row: ' + names);

            this._settings.set_strv(this._strvKey, names);

            this.unlock();
        } else {
            LOG('tried to delete row but it was locked');
        }
    }
});

const WindowOptionsPrefsWidget = new GObject.Class({
    Name: 'WindowOptions.Prefs.Widget',
    GTypeName: 'WindowOptionsPrefsWidget',
    Extends: Gtk.Grid,

    _init: function (params) {
        this.parent(params);
        this.margin = this.row_spacing = this.column_spacing = 10;
        this._rownum = 0;
        this._settings = Convenience.getSettings();
        this.set_orientation(Gtk.Orientation.VERTICAL);
        /* Length cutoff item */
        let adjustment = new Gtk.Adjustment({
            lower: -1,
            upper: 10,
            step_increment: 1
        });
        let spinButton = new Gtk.SpinButton({
            adjustment: adjustment,
            digits: 0,
            snap_to_ticks: true,
            numeric: true,
        });
        spinButton.set_value(this._settings.get_int(LENGTH_CUTOFF_KEY));
        spinButton.connect('value-changed', Lang.bind(this, function (spin) {
            let value = spinButton.get_value_as_int();
            if (this._settings.get_int(LENGTH_CUTOFF_KEY) !== value) {
                LOG('spin value changed');
                this._settings.set_int(LENGTH_CUTOFF_KEY, value);
            }
        }));
        this.addRow(WO_("If this many items or more are already in the AppMenu, window options will be in a submenu\n (0: always in submenu, -1: never in submenu)"), spinButton, true);

        /* The "display as toggle or alternating text" */
        let label = new Gtk.Label({label: WO_("Do you wish the following items to appear as label with on/off toggle,\n or a plain label that changes its text?")})
        this.addItem(label);

        this.addBoolean(ITEM_LABELS[ITEM_KEYS.MAXIMIZE] + '/' +
            ITEM_LABELS[ITEM_KEYS.RESTORE],
            ITEM_KEYS.MAXIMIZE + TOGGLE_KEY_SUFFIX
        );
        this.addBoolean(ITEM_LABELS[ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE] +
            '/' + ITEM_LABELS[ITEM_KEYS.ALWAYS_ON_THIS_WORKSPACE],
            ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE + TOGGLE_KEY_SUFFIX
        );

        label = new Gtk.Label({label: WO_("Configure your window options menu here.")});
        this.addItem(label);

        /* Make a treeview to display the current menu.
         * For now, remove the ability to name the items whatever we want.
         * (do that later).
         */
        this._store = new ListModel(this._settings, ORDER_KEY, 0);
        this._treeView = new Gtk.TreeView({
            model: this._store,
            hexpand: true,
            vexpand: true,
            headers_visible: false,
            reorderable: true //TODO: want drag and drop, & tie this to settings change.
        });
        this._treeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

        // add one column being the items.
        let col = new Gtk.TreeViewColumn({ title: WO_("Items") });
        let textRenderer = new Gtk.CellRendererText({ editable: false });
        col.pack_start(textRenderer, true);
        col.add_attribute(textRenderer, 'text', this._store.Columns.LABEL);

        // add column to tree view
        this._treeView.append_column(col);

        // add tree view to widget
        this.addItem(this._treeView);

        /* Now add a toolbar with 'add' and 'delete' for the treeview */
        let toolbar = new Gtk.Toolbar();
        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);

        let newButton = new Gtk.ToolButton({ stock_id: Gtk.STOCK_NEW });
        newButton.connect('clicked', Lang.bind(this, this._newClicked));
        toolbar.add(newButton);

        let delButton = new Gtk.ToolButton({ stock_id: Gtk.STOCK_DELETE });
        delButton.connect('clicked', Lang.bind(this, this._delClicked));
        toolbar.add(delButton);

        this.addItem(toolbar);
        // TODO: VERTICAL SCROLL

        let spacer = new Gtk.SeparatorToolItem({draw: false});
        spacer.set_expand(true);
        toolbar.add(spacer);

        /* "default" button TODO: how to get it to show the label? */
        let defaultButton = new Gtk.ToolButton({
            icon_widget: new Gtk.Label({label: WO_("Defaults")})
        });
        defaultButton.connect('clicked', Lang.bind(this, function () {
            this._settings.reset(LENGTH_CUTOFF_KEY);
            this._settings.reset(ORDER_KEY);
            spinButton.set_value(this._settings.get_int(LENGTH_CUTOFF_KEY));
            this._store._reloadFromSettings();
        }));
        toolbar.add(defaultButton);
    },

    addBoolean: function (text, key) {
        let item = new Gtk.Switch({active: this._settings.get_boolean(key)});
        this._settings.bind(key, item, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.addRow(text, item);
    },

    addRow: function (text, widget, wrap) {
        let label = new Gtk.Label({ label: text });
        label.set_line_wrap(wrap || false);
        this.attach(label, 0, this._rownum, 1, 1); // col, row, colspan, rowspan
        this.attach(widget, 1, this._rownum, 1, 1);
        this._rownum++;
    },

    addItem: function (widget, col, colspan, rowspan) {
        this.attach(widget, col || 0, this._rownum, colspan || 2, rowspan || 1);
        this._rownum++;
    },
    // TODO: lock on drag/drop to prevent 3 changes being fired.

    /* add/delete from treeView */
    _newClicked: function () {
        /* Show them a list of allowable items to add in a dialog */
        let dialog = new Gtk.Dialog({
            title: WO_("Select item to add"),
            transient_for: this.get_toplevel(),
            modal: true
        });
        dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
        dialog.add_button(WO_("Add"), Gtk.ResponseType.OK);
        dialog.set_default_response(Gtk.ResponseType.OK);

        // set up a treeview to show the available items
        const Columns = {
            KEY: 0,
            LABEL: 1
        };
        let list = new Gtk.ListStore(),
            currentItems = this._settings.get_strv(ORDER_KEY);
        LOG(JSON.stringify(currentItems));
        list.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
        for (let i in ITEM_KEYS) {
            /* only add items we don't already have (except the separator) */
            if (ITEM_KEYS.hasOwnProperty(i) &&
                    (ITEM_KEYS[i] === ITEM_KEYS.SEPARATOR ||
                         currentItems.indexOf(ITEM_KEYS[i]) === -1) &&
                    DUMMY_KEYS.indexOf(ITEM_KEYS[i]) === -1) {
                let iter = list.append(),
                    label = ITEM_LABELS[ITEM_KEYS[i]];
                if (ITEM_KEYS[i] === ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE) {
                    label = label + '/' + ITEM_LABELS[ITEM_KEYS.ALWAYS_ON_THIS_WORKSPACE];
                } else if (ITEM_KEYS[i] === ITEM_KEYS.MAXIMIZE) {
                    label = label + '/' + ITEM_LABELS[ITEM_KEYS.RESTORE];
                }
                // display the label they've currently set for that item
                list.set(
                    iter,
                    [Columns.KEY, Columns.LABEL],
                    [ITEM_KEYS[i], label]
                );
            }
        }

        let treeView = new Gtk.TreeView({
            model: list,
            hexpand: true,
            vexpand: true,
            headers_visible: false
        });
        treeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

        let column = new Gtk.TreeViewColumn({title: WO_("Items")});
        let renderer = new Gtk.CellRendererText({editable: false});
        column.pack_start(renderer, true);
        column.add_attribute(renderer, 'text', Columns.LABEL);

        treeView.append_column(column);
        dialog.get_content_area().add(treeView);
        dialog._treeView = treeView;
        dialog._list = list;

        dialog.connect('response', Lang.bind(this, function (dialog, id) {
            if (id != Gtk.ResponseType.OK) {
                dialog.destroy();
                return;
            }
            let [any, model, iter] = dialog._treeView.get_selection().get_selected();
            if (any) {
                let item = dialog._list.get_value(iter, Columns.LABEL),
                    iter2 = this._store.append(),
                    key = dialog._list.get_value(iter, Columns.KEY);
                this._store.set(iter2,
                    [this._store.Columns.KEY, this._store.Columns.LABEL],
                    [key , item]
);
            }
            dialog.destroy();
        }));

        dialog.show_all();
    },

    _delClicked: function () {
        let [any, model, iter] = this._treeView.get_selection().get_selected();

        if (any) {
            this._store.remove(iter);
        }
    }
});

function buildPrefsWidget() {
    let widget = new WindowOptionsPrefsWidget();
    widget.show_all();

    return widget;
}
