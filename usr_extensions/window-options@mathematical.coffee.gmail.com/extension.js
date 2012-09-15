/**
 * Window Options extension
 * v2.0_gnome3.4 (v4 on e.g.o).
 * mathematical.coffee@gmail.com
 *
 * This extension adds 'minimize', 'maximize', ..., 'always on top'
 * etc options to the right-click menu of the title bar.
 *
 * It is meant to be compatible with the StatusTitleBar extension.
 *
 * TODO:
 * - translations (how? surely system has these already??)
 */

/****************** CODE ********************/
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;
//const Wnck = imports.gi.Wnck;
const Signals  = imports.signals;
const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const Shell = imports.gi.Shell;

const ExtensionSystem = imports.ui.extensionSystem;
//const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Prefs = Me.imports.prefs;
const ITEM_KEYS = Prefs.ITEM_KEYS;

function LOG() {
    let msg = arguments[0];
    if (arguments.length > 1) {
        [].shift.call(arguments);
        msg = ''.format.apply(msg, arguments);
    }
    //log(msg);
    return msg;
}

/* WindowMenu class.
 * feed it in a menu to patch (the actual menu, e.g. appMenu.menu)
 * If you want to add this to your own class, you need to override
 * _getCurrentWindowMutter and _getCurrentWindowWnck to return the Meta.Window
 *  or Wnck.Window that you want the actions to apply to.
 */
function WindowOptionsMenuPatch() {
	this._init.apply(this, arguments);
}

WindowOptionsMenuPatch.prototype = {
    _init: function (menu) {
        this.menu = menu;
        this._workspaceItems = [];
        this._menuSignals = [];
        this._changeWorkspaceID = null;
        this._items = {};

        if (menu) {
            this.init();
        }
    },

    init: function (menu) {
        this.menu = menu || this.menu;
        if (this.menu) {
            this._setupMenu();
            this._menuSignals.push(this.menu.connect('destroy', Lang.bind(this,
                this._onMenuDestroy)));
            return true;
        }
        LOG("WARNING: set this.menu before calling init().");
        return false;
    },

    /* when the menu we are patching is destroyed, we have to as well. */
    _onMenuDestroy: function () {
        LOG('[patch] _onMenuDestroy');
        /* remove menu items */
        if (this.submenu) { 
            // Note: we don't call this.submenu.destroy() here because if the parent
            // menu has been destroyed already, it has already called .destroy()
            // on all its children, and calling it again here would trigger an
            // error as PopupMenuBase attempts to disconnect the same submenu
            // signals twice (the second time triggering the error "Signal XX
            // not found").
            this.submenu = null;
        }
        this._workspaceItems = [];

        if (this._changeWorkspaceID) {
            global.window_manager.disconnect(this._changeWorkspaceID);
        }

        if (this._NWorkspacesChangeID) {
            global.screen.disconnect(this._NWorkspacesChangedID);
            this._NWorkspacesChangedID = null;
        }

        let i = this._menuSignals.length;
        if (this.menu) { // menu might have been destroyed.
            while (i--) {
                this.menu.disconnect(this._menuSignals[i]);
            }
            this._menuSignals = [];
            this.menu = null;
        }
        this.emit('patch-destroy');
    },

    /* we distinguish destroy() from destroyPatch.
     * All destroyPatch does is call submenu.destroy() additionally to destroyPatch.
     * The reason we don't do submenu.destroy() in destroyPatch is that destroyPatch
     * gets called whenenever the parent menu is destroyed, which calls submenu.destroy()
     * for us. If we try to call it again, we get an error due to already-disconnected
     * signals being disconnected again ("No signal connection 1 found")
     */
    destroy: function () {
        this.submenu.destroy();
        this._onMenuDestroy();
    },

    _setupMenu: function () {
        LOG("populating menu. Current length: %d", this.menu.length);
        let length = settings.get_int(Prefs.LENGTH_CUTOFF_KEY);
        this.submenu = (length >= 0 && this.menu.length >= length ?
            new PopupMenu.PopupSubMenuMenuItem(_("Window Options")) :
            new PopupMenu.PopupMenuSection());
        this.menu.addMenuItem(this.submenu, 0);

        /* Add items */
        let toAdd = settings.get_strv(Prefs.ORDER_KEY);
        for (let i = 0; i < toAdd.length; ++i) {
            let buttonName = toAdd[i],
                label = Prefs.ITEM_LABELS[buttonName];
            if (buttonName === ITEM_KEYS.SEPARATOR) {
                this._items[buttonName] = new PopupMenu.PopupSeparatorMenuItem();
            } else if (buttonName === ITEM_KEYS.MOVE_TO_WORKSPACE) {
                this._items[buttonName] = this._workspaceMenu = new 
                    PopupMenu.PopupSubMenuMenuItem(label);
                this._NWorkspacesChangedID = global.screen.connect(
                        'notify::n-workspaces',
                        Lang.bind(this, this._onNWorkspacesChanged)
                );
                this._changeWorkspaceID = global.window_manager.connect(
                        'switch-workspace',
                        Lang.bind(this, this._onWorkspaceChanged)
                );
                this._onNWorkspacesChanged();
                this._onWorkspaceChanged();
            } else if (buttonName === ITEM_KEYS.ALWAYS_ON_TOP ||
                buttonName === ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE) {
                // toggles
                this._items[buttonName] = new PopupMenu.PopupSwitchMenuItem(
                        label, false);
                this._items[buttonName].connect('toggled',
                    Lang.bind(this, this._onActivate, buttonName));
            } else {
                    this._items[buttonName] = new PopupMenu.PopupMenuItem(label);
                    this._items[buttonName].connect('activate',
                        Lang.bind(this, this._onActivate, buttonName));
            }
            /* PopupSubMenuMenuItem has a .menu but MenuSection doesn't */
            if (this.submenu.menu) {
                this.submenu.menu.addMenuItem(this._items[buttonName]);
            } else {
                this.submenu.addMenuItem(this._items[buttonName]);
            }
        }

        if (this._items[ITEM_KEYS.MOVE_TO_NEXT_WORKSPACE] ||
                this._items[ITEM_KEYS.MOVE_TO_PREVIOUS_WORKSPACE]) {
            if (!this._workspaceMenu) {
                this._changeWorkspaceID = global.window_manager.connect(
                        'switch-workspace',
                        Lang.bind(this, this._onWorkspaceChanged)
                );
            }
            this._onWorkspaceChanged();
        }
        /* Whenever menu is opened, update the toggles */
        if (this._items[ITEM_KEYS.ALWAYS_ON_TOP] ||
                this._items[ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE]) {
            this._menuSignals.push(this.menu.connect('open-state-changed',
                Lang.bind(this, this._updateToggles)));
        }
    },

    _onNWorkspacesChanged: function () {
        let oldLength = this._workspaceItems.length,
            newLength = global.screen.n_workspaces;
        if (oldLength > newLength) {
            // delete the last (oldLength - newLength) items.
            let i = oldLength - newLength;
            while (i--) {
                (this._workspaceItems.pop()).destroy();
            }
        } else {
            // add new items (1-based labels, 0-based indices)
            let itm;
            for (let i = oldLength+1; i <= newLength; ++i) {
                itm = new PopupMenu.PopupMenuItem(Prefs.ITEM_LABELS[ITEM_KEYS.MOVE_TO_WORKSPACE] + ' ' + i);
                itm.connect('activate', Lang.bind(this, this._onActivate,
                            ITEM_KEYS.MOVE_TO_WORKSPACE, i-1));
                this._workspaceItems.push(itm);
                this._workspaceMenu.menu.addMenuItem(itm);
            }
        }
    },

    _onWorkspaceChanged: function (shellwm, fromI, toI, direction) {
        toI = (toI === undefined ? global.screen.get_active_workspace_index() : toI);
        if (this._workspaceMenu) {
            if (fromI) {
                this._workspaceItems[fromI].setSensitive(true);
            } 
            this._workspaceItems[toI].setSensitive(false);
        }
        if (this._items[ITEM_KEYS.MOVE_TO_NEXT_WORKSPACE]) {
            if (fromI === global.screen.n_workspaces - 1) {
                this._items[ITEM_KEYS.MOVE_TO_NEXT_WORKSPACE].setSensitive(true);
            }
            if (toI === global.screen.n_workspaces - 1) {
                this._items[ITEM_KEYS.MOVE_TO_NEXT_WORKSPACE].setSensitive(false);
            }
        }
        if (this._items[ITEM_KEYS.MOVE_TO_PREVIOUS_WORKSPACE]) {
            if (fromI === 0) {
                this._items[ITEM_KEYS.MOVE_TO_PREVIOUS_WORKSPACE].setSensitive(true);
            }
            if (toI === 0) {
                this._items[ITEM_KEYS.MOVE_TO_PREVIOUS_WORKSPACE].setSensitive(false);
            }
        }
    },

    _getCurrentWindowMutter: function () {
        let windows = Shell.WindowTracker.get_default().focus_app.get_windows();
        for (let i = 0; i < windows.length; i++) {
            if (windows[i].has_focus()) {
                return windows[i];
            }
        }
        // didn't find it.
        return null;
    },

    _getCurrentWindowWnck: function () {
        return Wnck.Screen.get_default().get_active_window();
    },

    _onActivate: function (item, event, op, extraArgs) {
        let current_window = null;

        /* Ideally we want to use mutter for everything, but the JS
         * interface doesn't have always on top/always on visible workspace exposed,
         * so we have to use wnck until they do.
         */
        if (op === ITEM_KEYS.ALWAYS_ON_TOP ||
                op === ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE) {
            // go through wnck: not ideal, but these methods are not available through mutter yet.
            current_window = this._getCurrentWindowWnck();
        } else {
            current_window = this._getCurrentWindowMutter();
        }

        if (current_window) {
            /* The following are Mutter methods */
            if (op === ITEM_KEYS.MINIMIZE) {
                current_window.minimize();
            } else if (op === ITEM_KEYS.MAXIMIZE) {
                // NOTE: see Meta-1.0.gir for exported flags etc.
                current_window.maximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
            } else if (op === ITEM_KEYS.RESTORE) {
                current_window.unmaximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
            } else if (op === ITEM_KEYS.MOVE) {
                /* Use global.display.begin_grab_op for move and resize.
                 * (In GNOME 3.4+ see panel.js for details).
                 * It only works with Meta.later_add, because at time of clicking
                 * this dropdown menu has the current grab focus.
                 * Move the cursor to middle of the window.
                 */
                Mainloop.idle_add(function () {
                    let pointer = Gdk.Display.get_default().get_device_manager().get_client_pointer(),
                        [scr,,] = pointer.get_position(),
                        rect    = current_window.get_outer_rect(),
                        x       = rect.x + rect.width/2,
                        y       = rect.y + rect.height/2;
                    pointer.warp(scr, x, y);
                    global.display.begin_grab_op(global.screen, current_window,
                        Meta.GrabOp.MOVING, false, true, 1, 0, global.get_current_time(),
                        x, y);
                    return false;
                });
            } else if (op === ITEM_KEYS.RESIZE) {
                Mainloop.idle_add(function () {
                    let pointer = Gdk.Display.get_default().get_device_manager().get_client_pointer(),
                        [scr,,] = pointer.get_position(),
                        rect    = current_window.get_outer_rect(),
                        x       = rect.x + rect.width,
                        y       = rect.y + rect.height;
                    pointer.warp(scr, x, y);
                    global.display.begin_grab_op(global.screen, current_window,
                        Meta.GrabOp.RESIZING_SE, false, true, 1, 0, global.get_current_time(),
                        x, y);
                    return false;
                });
            } else  if (op === ITEM_KEYS.MOVE_TO_WORKSPACE) {
                if (typeof extraArgs === 'number') {
                    current_window.change_workspace_by_index(
                        extraArgs,
                        false, // don't create new workspace
                        global.get_current_time()
                    );
                } else {
                    LOG('received request to move window to workspace ' + extraArgs);
                }
            } else  if (op === ITEM_KEYS.MOVE_TO_NEXT_WORKSPACE) {
                current_window.change_workspace_by_index(
                        current_window.get_workspace().index() + 1,
                        false, // don't create new workspace
                        global.get_current_time()
                    );
            } else  if (op === ITEM_KEYS.MOVE_TO_PREVIOUS_WORKSPACE) {
                current_window.change_workspace_by_index(
                        current_window.get_workspace().index() - 1,
                        false, // don't create new workspace
                        global.get_current_time()
                    );
            } else if (op === ITEM_KEYS.CLOSE_WINDOW) {
                current_window.delete(global.get_current_time());

            /* The following are WNCK methods */
            } else if (op === ITEM_KEYS.ALWAYS_ON_TOP) {
                if (current_window.is_above()) {
                    current_window.unmake_above();
                } else {
                    current_window.make_above();
                }
            /* Note: there is both a `pin` and a `stick` method.
             * I don't notice any difference between the two, but according to
             * http://developer.gnome.org/libwnck/stable/WnckWindow.html#wnck-window-is-pinned
             * `pinned` : "whether window is on all workspace. Pinned state may change anytime a
             *   'workspace-changed' signal gets emitted, but not when 'state-changed' gets emitted
             * `sticky` : "whether a window is sticky. May change any time a "state-changed" signal
             *   gets emitted.
             *
             * Sticky means "stuck to the glass", i.e. does not scroll with viewport.
             * In GDK/GTK+, sticky means "stuck to the glass" and *also* that the window is on all
             * workspaces. But here it only means the viewport aspect of it.
             *
             * Hence I think 'on all workspaces' is 'pin'. (But this can change with workspace-changed?!)
             */
            } else if (op === ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE) {
                if (current_window.is_pinned()) {
                    current_window.unpin();
                } else {
                    current_window.pin();
                }
            }
        }
    }, // _onActivate

    _updateToggles: function (obj, open) {
        /* Update the 'above'/'on all workspaces' toggles in case the user has
         * set this not using the menus.
         */
        if (!open) {
            return;
        }

        let current_window = this._getCurrentWindowMutter();
        if (this._items[ITEM_KEYS.ALWAYS_ON_TOP] &&
                (this._items[ITEM_KEYS.ALWAYS_ON_TOP].state !==
                 current_window.above)) {
            this._items[ITEM_KEYS.ALWAYS_ON_TOP].setToggleState(
                    current_window.above);
        }

        if (this._items[ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE] &&
                (this._items[ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE].state !==
                 current_window.is_on_all_workspaces())) {
            this._items[ITEM_KEYS.ALWAYS_ON_VISIBLE_WORKSPACE].setToggleState(
                    current_window.is_on_all_workspaces());
        }
    }
}; // end WindowOptionsMenuPatch.prototype
Signals.addSignalMethods(WindowOptionsMenuPatch.prototype);

/* WindowOptionsMenuHandler class.
 * This tries to find the system title bar object to patch the WindowOptionsMenu
 * to. It also tries to listen for it being destroyed to re-add.
 */
function WindowOptionsMenuHandler() {
	this._init.apply(this, arguments);
}
WindowOptionsMenuHandler.prototype = {
    _init: function () {
        this.menuPatch = null;
        this.menuHolder = null;
        this._startupID = null;
        this._destroyID = null;

        /* Try to get the 'Title Bar' object.
         * This is identified as the object with a ._targetApp property.
         */
        let children = Main.panel._leftBox.get_children(),
            i = children.length;
        while (i--) {
            if (children[i]._delegate &&
                    children[i]._delegate._targetApp !== undefined) {
                 // if _targetApp is set but NULL it will still pass this test.
                this.setMenu(children[i]._delegate);
                break;
            }
        }
        if (!this.menuHolder) {
            LOG("Couldn't find an appMenu-like object - what to do now?!")
        }
    },

    /* repatches item 'menuHolder' which has member .menu */
    setMenu: function(menuHolder) {
        LOG('setMenu: ' + menuHolder);
        this.menuHolder = menuHolder;

        /* destroy the current patch */
        if (this.menuPatch) {
            if (this._destroyID) {
                this.menuPatch.disconnect(this._destroyID);
            }
            //this.menuPatch.destroy(); // it's already had destroy() called by now
            this.menuPatch = null;
        }
        this.menuPatch = new WindowOptionsMenuPatch(menuHolder.menu);
        /* theMenu.menu is null until there is a focus app, so wait until then
         * to intialise the menu. Then we can stop listening to this event.
         */
        if (!menuHolder.menu) {
            let tracker = Shell.WindowTracker.get_default();
            this._startupID = tracker.connect('notify::focus-app', Lang.bind(this, function () {
                if (this.menuHolder.menu) {
                    this.menuPatch.init(this.menuHolder.menu);
                    Shell.WindowTracker.get_default().disconnect(this._startupID);
                    this._startupID = null;
                }
            }));
        }
        this._destroyID = this.menuPatch.connect('patch-destroy', Lang.bind(this, this._onMenuDestroy));
    },

    _onMenuDestroy: function () {
        /* Epiphany destroys the menu & replace it with its own (GNOME 3.3+).
         * We wait for it to be made and re-patch it.
         * But *NOTE* you get a *really long* menu, very inconvenient.
         * Add it as a submenu 'Window' ? Or two-columns ?
         */
        LOG('appMenu watcher detected menu patch destroy signal, calling this.setMenu');
        Mainloop.idle_add(Lang.bind(this, function () {
            this.setMenu(this.menuHolder);
            return false;
        }));
    },

    destroy: function () {
        LOG('destroying the appMenu watcher');
        if (this._startupID) {
            let tracker = Shell.WindowTracker.get_default();
            tracker.disconnect(this._startupID);
            this._startupID = null;
        }
        if (this._destroyID) {
            this.menuPatch.disconnect(this._destroyID);
            this._destroyID = null;
        }
        this.menuPatch.destroy();
        this.menuPatch = null;
        this.menuHolder = null;
    }
}; // end WindowOptionsMenuHandler.prototype

let settings = null, windowOptions = null, settingsChangedID = null, detectExtensionsID = null;

function init() {
    Convenience.initTranslations();
    settings = Convenience.getSettings();
}

function enable() {
    windowOptions = new WindowOptionsMenuHandler();
    settingsChangedID = settings.connect('changed', function () {
        /* we need to re-make all the menus with the appropriate items */
        if (windowOptions.menuPatch) {
            LOG('settings changed');
            windowOptions.menuPatch.destroy(); // will trigger a re-display.
        }
    });
}

function disable() {
    if (windowOptions) {
        windowOptions.destroy();
    }
    windowOptions = null;
    if (settingsChangedID) {
        settings.disconnect(settingsChangedID);
    }
    if (detectExtensionsID) {
        ExtensionSystem.disconnect(detectExtensionsID);
        detectExtensionsID = null;
    }
}

