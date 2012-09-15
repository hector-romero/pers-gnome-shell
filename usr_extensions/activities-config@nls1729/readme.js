const Gtk = imports.gi.Gtk;
const Gettext = imports.gettext.domain('nls1729-extensions');

// Notes for Reviewer - changes for version 5
//
// Changed prefs.js to use prototype instead of GObject - bug in 3.4.2 gjs see thread
// https://mail.gnome.org/archives/gnome-shell-list/2012-August/msg00142.html bug is fixed
// in gnome repository but may not get downstream to all distros promptly.
//
// Changed extension.js to recognise conflicts with other extensions (user reported)
//
// Added notify.js to facilitate reporting conflicts
//
// Changed readme.js to provide explanation of conflicts and how handled
//



let README = [ "The Activities Text can be changed by entering New Text and then pressing the APPLY button.", "  ",
"The text spacing on the panel is adjustable with the Text Padding scale.", "  ",
"The text can be removed from the panel with the Hide Text switch.", "\n\n",
"The Activities Icon is selectable with the SELECT Icon button.", "  ",
"The icon spacing on the panel is adjustable with the Icon Padding scale.", "  ",
"The icon can be removed from the panel with the Hide Icon switch.", "\n\n",
"Text and icon padding is left horizontal padding in pixels.", "\n\n",
"The sensitivity of the hot corner is adjustable with the Hot Corner Sensitivity scale.", "  ",
"A small delay in milliseconds before activation of the hot corner can prevent an inadvertent mouse movement from toggling the Overview.", "  ",
"The default delay is 250 ms which seems to prevent most false Overview toggles.", "  ",
"The hot corner Overview switching is disabled with the Disable Hot Corner switch.",  "  ",
"If the hot corner is disabled the Overview can be toggled with the left super key.", "\n\n",
"The Activities Button can be removed with the Remove Activities Button switch.", "\n\n",
"The workspace background may appear more aesthetically pleasing without the black panel background.", "  ",
"The panel can be made transparent with the Transparent Panel switch.", "  ",
"This feature requires selection of a workspace background of colors which contrast with the icons and text displayed in the panel.", "\n\n",
"Extension settings are reset to their default values with the Extension Defaults RESET button.", "\n\n",
"The Extension Description README button displays this readme.", "\n\n",
"Any extension which moves or removes the Activities Button will cause conflicts with this extension.", "  ",
"If a conflict is detected the Activities Configurator will notify of the event.", "  ",
"If the conflict is detected at session startup the Activities Configurator will not install its own functionality when enabled.", "  ",
"If the conflict is detected after session startup the Activities Configurator will uninstall its own functionality.", "  ",
"The conflict can be resolved by disabling the conflicting extension or this extension and restarting the session.", "\n\n"];

let CONFLICTS = ["A conflict between an enabled extension and the Activities Configurator Extension exists.", "  ",
"Please resolve the conflict by disabling the offending extension or disable the Activities Configurator and restart your session.", "  ",
"See the README of the Activities Configurator for additional information.", "\n"];

let showing = false;

function destroyed() {
    showing = false;
    return false;
}

function makeTextStr(strings) {
    let str = '';
    for(let i = 0; i < strings.length; i++) {
        str = str  + Gettext.gettext(strings[i]);
    }
    return str;
}

function showReadme() {
    if(showing)
        return;
    showing = true;
    let textStr = makeTextStr(README);
    let readmeWindow = new Gtk.Window({'type': Gtk.WindowType.TOPLEVEL,
                                       'title': 'Activities Configurator README'});
    let sw = new Gtk.ScrolledWindow({'hscrollbar-policy': Gtk.PolicyType.AUTOMATIC,
                                     'vscrollbar-policy': Gtk.PolicyType.AUTOMATIC,
                                     'hexpand': true,
                                     'vexpand': true});
    let tv = new Gtk.TextView({'wrap-mode': Gtk.WrapMode.WORD,
                               'editable': false});
    readmeWindow.set_size_request(600, 400);
    let grid = new Gtk.Grid({'margin': 10, 'row_spacing': 10, 'column_spacing': 10});
    sw.add(tv);
    grid.attach(sw, 0,0,1,1);
    readmeWindow.add(grid);
    readmeWindow.connect('delete-event', destroyed);
    tv.get_buffer().set_text(textStr, textStr.length);
    readmeWindow.show_all();
}
