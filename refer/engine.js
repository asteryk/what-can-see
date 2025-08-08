/*

    The color_blind_sims() JavaScript function in the is
    copyright (c) 2000-2001 by Matthew Wickline and the
    Human-Computer Interaction Resource Network ( http://hcirn.com/ ).
    
    The rest of this work, including the remainder of the JavaScript
    and the documentation, was released by the author Matthew Wickline
    into the Public Domain on 2001 July 17th.
    
    The color_blind_sims() function is used with the permission of
    Matthew Wickline and HCIRN, and is freely available for non-commercial
    use. For commercial use, please contact the
    Human-Computer Interaction Resource Network ( http://hcirn.com/ ).
    (This notice constitutes permission for commercial use from Matthew
    Wickline, but you must also have permission from HCIRN.)
    Note that use of the color laboratory hosted at aware.hwg.org does
    not constitute commercial use of the color_blind_sims()
    function. However, use or packaging of that function (or a derivative
    body of code) in a for-profit piece or collection of software, or text,
    or any other for-profit work *shall* constitute commercial use.

    20151129 UPDATE
        HCIRN appears to no longer exist. This makes it impractical
        for users to obtain permission from HCIRN in order to use
        color_blind_sims() for commercial works. Instead:

        This work is licensed under a
        Creative Commons Attribution-ShareAlike 4.0 International License.
        http://creativecommons.org/licenses/by-sa/4.0/

*/




// I'm trying to use only JavaScript 1.1 features.
// Someone with an old browser will have to tell me if I've screwed up.
// Among other things, this means no regular expressions, and no switch/case.


// start with some globals (the first ones are configurable)

var SWATCHES = 15; // how many swatches do you want to allow user to pick?
SWATCHES--; // because arrays are 0-indexed
var prefs = new Object();
    // user preferences as set in the UI
    // set these prefs to change default behavior
prefs.showPermutations = true; // do or don't show above perm* variations in swatches
prefs.showShades = true; // do or don't show lighter/darker shades in swatches
prefs.colorMonitor = 1; // veiwing color or monochrome monitor
prefs.colorVisionType = 'normal'; // one of normal,protan,deutan,tritan,monoch,anompr,anomde,anomtr,anommo
prefs.dgamma = 2; // index 2 (PC) in the menu for developer gamma (below)
prefs.vgamma = 2; // index 2 (PC) in the menu for simulated viewer gamma (below)
var gamma_menu = new Array(4);
    gamma_menu[0] = new Object();
    gamma_menu[0].label_dev = "I'm using an SGI (X: gamma = 1.70)";
    gamma_menu[0].label_usr = 'SGI';
    gamma_menu[0].value = 1.70;
    gamma_menu[1] = new Object();
    gamma_menu[1].label_dev = "I'm using a Mac (Quartz or Quickdraw: gamma = 1.80)";
    gamma_menu[1].label_usr = 'Mac';
    gamma_menu[1].value = 1.80;
    gamma_menu[2] = new Object();
    gamma_menu[2].label_dev = "I'm using Windows (gamma = 2.20)";
    gamma_menu[2].label_usr = 'PC';
    gamma_menu[2].value = 2.20;
    gamma_menu[3] = new Object();
    gamma_menu[3].label_dev = "I'm using *nix (X11: gamma = 2.20)";
    gamma_menu[3].label_usr = '*nix';
    gamma_menu[3].value = 2.20;
    gamma_menu[4] = new Object();
    gamma_menu[4].label_dev = "I'm using a NeXT (NeXTStep: gamma = 2.22)";
    gamma_menu[4].label_usr = 'NeXT';
    gamma_menu[4].value = 2.22;
var gui_state = new Object();
    // store state of gui so when user goes back/forth we can restore
    // change the next two lines to change the default user interface...
gui_state.controls = 'simulation'; // 'color_options' or 'simulation'
gui_state.size = 'md'; // 'sm'. 'md', 'lg' ... size of visibone color chart


// PLEASE DO *NOT* MANUALLY SET ANY GLOBALS BELOW HERE:

var rendr = new Object();
    // store last-rendered simulation type, to decrease re-calculation
rendr.colorMonitor = prefs.colorMonitor;
rendr.colorVisionType = prefs.colorVisionType;
prefs.setdgamma = false; // user hasn't yet told us their gamma level
prefs.gammac = 1; // gamma correction starts at 1 (no correction)
rendr.gammac = prefs.gammac;
var last_swatch = null; // highest valid index in the current swatchlist array
    // will always be less than or equal to SWATCHES
var selected_swatch = null;
    // index of the currently highlighted swatch (table surround color & details at top)
var swatchlist = new Array(SWATCHES); // array of swatch objects...
/* each object having these properties:
    name  ie: Dark Red
    abbr  abbreviation for name (ie: DR)
    fgnd  FFFFFF or 000000, color for text written on the swatch
    code  ie: FF0000 (may hold normal code, or a color-adjusted simulation value)
    normal  normal color code in RRGGBB, no simulation applied
NOTE: we cache these next four in the actual object in the hopes that
      doing so will be more efficient than calculating them as requested.
      I'm guessing that these are the most comon simulations folks will want.
      We don't try to cache every combination of simulation settings.
    sim   simulated colors
    safe  nearest websafe color
    less  move down a full web-safe interval in each R,G,B value
    more  move up a full web-safe interval in each R,G,B value
    ceil  highest value which won't round up to a new web safe color
    flor  lowest value which won't round down to a new web safe color
    othr  brightness-inverted version of color
    invt  the inverse color
    prma  permute ABCDEF -> CDEFAB (or something in that spirit)
    prmb  permute ABCDEF -> EFDCAB (or something in that spirit)
    prmc  permute ABCDEF -> EFABCD (or something in that spirit)
    prmd  permute ABCDEF -> ABEFCD (or something in that spirit)
    prme  permute ABCDEF -> CDABEF (or something in that spirit)
*/




// done with globals.
// now the functions...




function define_top_frames( doc ) {
    // called by frames.html to insert the frameset stuff
    // May need to update palette frames' dimensions to work with more browsers...
    var p_width  = 278; // default to medium palette's width
    var p_height = 295; // default to medium palette's height
    if ( gui_state.size == 'sm' ) {
        p_width  = 202;
        p_height = 217;
    } else if ( gui_state.size == 'lg' ) {
        p_width  = 389;
        p_height = 418;
    } // default md is fine
    var control_frame = prefs.setdgamma ? gui_state.controls : 'gamma_base';
    doc.writeln(
        '<frameset rows="'+p_height+',*">',
            '<frameset cols="'+p_width+',*">',
                '<frame name="palette"  src="palette_'+gui_state.size+'.html" marginheight="0" marginwidth="0" title="color-picking palette: click on colors to create swatches">',
                '<frame name="controls" src="'        +control_frame +'.html" marginheight="0" marginwidth="0" title="additional controls (either simulation controls, or additional color-picking tools)">',
            '</frameset>',
            '<frame name="renderspace" src="blank.html" title="swatch rendering area">',
            '<noframes>',
                '<body>',
                    'You should have already encountered a noframes explanation before this point.',
                '</body>',
            '</noframes>',
        '</frameset>'
    );
}


// these next two functions are called by the palette image maps...


function set_palette( size ) {
    // called by clicking on differently-sized palette in the palette image map
    if ( size == gui_state.size ||
        ( size != 'sm' && size != 'md' && size != 'lg' )
    ) {
        return;
    }
    gui_state.size = size;
    contentframe.location = 'frames.html';
    update_colorpicker_image();
}
function pick( color ) {
    // called by clicking on a color in the palette image map
    build_and_insert_new_swatch( color );
    selected_swatch = 0;
    show();
}


// these next functions are shared by the controls pages...


function set_controls( type ) {
    // called by the 'switch' links in the controls pages
    if ( type != gui_state.controls
            && ( type == 'simulation' || type == 'color_options' )
    ) {
        gui_state.controls = type;
        contentframe.controls.location = type + '.html';
        if ( simulating_anything() || prefs.showShades || prefs.showPermutations ) {
            show(); // otherwise, display should not require any change
        }
    }
    update_colorpicker_image();
}
function restore_controls_state() {
    // called as a control frame is being rendered. Syncs the UI with settings
    if ( gui_state.controls == 'simulation' ) {
        // restore simulation controls
        var mono_index = prefs.colorMonitor;
        var cv_index = 0; // default to normal color vision
             if ( prefs.colorVisionType == 'protan' ) { cv_index = 1; }
        else if ( prefs.colorVisionType == 'deutan' ) { cv_index = 2; }
        else if ( prefs.colorVisionType == 'tritan' ) { cv_index = 3; }
        else if ( prefs.colorVisionType == 'monoch' ) { cv_index = 4; }
        else if ( prefs.colorVisionType == 'anompr' ) { cv_index = 5; }
        else if ( prefs.colorVisionType == 'anomde' ) { cv_index = 6; }
        else if ( prefs.colorVisionType == 'anomtr' ) { cv_index = 7; }
        else if ( prefs.colorVisionType == 'anommo' ) { cv_index = 8; }
        contentframe.controls.document.sim.mono.options[mono_index].selected = true;
        contentframe.controls.document.sim.cv.options[cv_index].selected     = true;
        contentframe.controls.document.sim.vg.options[prefs.dgamma].selected = true;
    } else if ( gui_state.controls == 'color_options' ) {
        // restore custom color controls
        var shades_index   = prefs.showShades       ? 1 : 0;
        var permutes_index = prefs.showPermutations ? 1 : 0;
        contentframe.controls.document.rrggbb.shades.options[shades_index].selected     = true;
        contentframe.controls.document.rrggbb.permutes.options[permutes_index].selected = true;
    }
}


// these next functions are called by the simulation.html controls...


function draw_gamma_menu( doc, who ) {
    // called by simulation.html to insert the gamma menus
    var selected;
    var postscript = '';
    if ( who == 'dev' ) {
        selected = prefs.dgamma;
        doc.writeln(
            '<select size="1" name="dg">'
        );
        postscript = ( '<br>'
            + '<input type="button" value="show simulation controls" onclick="parent.parent.set_developer_gamma()">'
        );
    } else {
        selected = prefs.vgamma;
        doc.writeln(
            '<select size="1" name="vg" onchange="parent.parent.set_viewer_gamma()">'
        );
    }
    for (var j=0 ; j<=4 ; j++ ) {
        doc.write( '<option value="' );
        doc.write( gamma_menu[j].value );
        doc.write( '"' );
        if ( j == selected ) {
            doc.write( ' selected' );
        }
        doc.write( '>' );
        doc.write( gamma_menu[j]['label_'+who] );
        doc.writeln( '</option>' );
    }
    doc.writeln( '</select>', postscript )
}
function set_viewer_gamma() {
    prefs.vgamma = contentframe.controls.document.sim.vg.selectedIndex;
    set_gamma_adjustment();
}
function set_developer_gamma() {
    prefs.dgamma = contentframe.controls.document.sim.dg.selectedIndex;
    prefs.setdgamma = true;
    // set viewer gamma to follow developer
    prefs.vgamma = contentframe.controls.document.sim.dg.selectedIndex;
    contentframe.controls.location = gui_state.controls + '.html';
}
function set_gamma_adjustment() {
    // called after a change to developer or simulated viewer gamma value
    var old_gammac = prefs.gammac;
    prefs.gammac = (
        gamma_menu[prefs.vgamma].value
        /
        gamma_menu[prefs.dgamma].value
    );
    if ( prefs.gammac != old_gammac ) { show(); }
}
function set_color_vision_type() {
    var vision_type = (
        contentframe.controls.document.sim.cv.options[
        contentframe.controls.document.sim.cv.selectedIndex
        ].value
    );
    if ( prefs.colorVisionType == vision_type ) {
        return;
    }
    prefs.colorVisionType = 'normal'; // defaul to normal...
    if (  vision_type=='protan'  ||  vision_type=='deutan'  ||  vision_type=='tritan' 
        ||vision_type=='anompr'  ||  vision_type=='anomde'  ||  vision_type=='anomtr'
        ||vision_type=='monoch'  ||  vision_type=='anommo'
    ) {
        prefs.colorVisionType = vision_type;
    }
    update_colorpicker_image();
    show();
}
function toggle_color_monitor() {
    prefs.colorMonitor = prefs.colorMonitor ? 0 : 1;
    show();
}
function cancel_simulations() {
    prefs.colorMonitor = 1;
    prefs.colorVisionType = 'normal';
    update_colorpicker_image();
    prefs.vgamma = prefs.dgamma;
    prefs.gammac = 1;
    restore_controls_state();
    show();
}


// these next functions are called by the color_options.html controls...


function add_custom_color() {
    // adds the color in the color_options text field
    var color = valid_color( contentframe.controls.document.rrggbb.color.value );
    contentframe.controls.document.rrggbb.color.value = '';
    if ( !color.length ) {
        alert(
            'Please specify RRGGBB hexidecimal or RGB abreviated hexidecimal color codes.\n'
            + 'Valid hex digits are 0123456789ABCDEF.'
        );
        return( false );
    }
    pick( color );
    return( false );
}
function add_named_color() {
    // adds the color selected in the color_name menu
    var color = valid_color(
        contentframe.controls.document.rrggbb.color_name.options[
        contentframe.controls.document.rrggbb.color_name.selectedIndex
        ].value
    );
    contentframe.controls.document.rrggbb.color.value = '';
    if ( !color.length ) {
        alert(
            'Please select a color from the menu.'
        );
        return( false );
    }
    pick( color );
    return( false );
}
function rgb_click( color, value ) {
    // called by the RGB tables to build a custom color from RGB parts
    var original = valid_color( contentframe.controls.document.rrggbb.color.value );
    var r  = '00';
    var g  = '00';
    var b  = '00';
    if ( original.length ) {
        r = original.substring(0,2);
        g = original.substring(2,4);
        b = original.substring(4,6);
    }
    if ( color == 'r' ) {
        r = value.substring(0,2);
    } else if ( color == 'g' ) {
        g = value.substring(2,4);
    } else if ( color == 'b' ) {
        b = value.substring(4,6);
    }
    contentframe.controls.document.rrggbb.color.value = r+g+b;
}
function toggle_shades() {
    prefs.showShades = !prefs.showShades;
    show();
}
function toggle_permutes() {
    prefs.showPermutations = !prefs.showPermutations;
    show();
}
function fresh_start() {
    // keep only the currently-highlighted swatch
    var tmp = swatchlist[selected_swatch];
    swatchlist = new Array(SWATCHES);
    swatchlist[0] = tmp;
    last_swatch = 0;
    selected_swatch = 0;
    show();
}
function clear_all(i) {
    // remove all swatches
    last_swatch = null;
    selected_swatch = null;
    swatchlist = new Array(SWATCHES);
    show();
}


// the following functions are called by links within the individual swatches...


function view_details( index ) {
    // the "i"/up-arrow link
    // to show color name, and use in table surround area
    selected_swatch = index;
    show();
}
function remove(i) {
    // the X link in the upper right of the swatch
    // to remove a swatch from the list
    remove_from_swatchlist(i);
    show();
}
function copy_to_start(i) {
    // the + link for the swatch's own color (after the parenthesized code)
    // to duplicate that color in the swatch list
    add_to_swatchlist( swatchlist[i] );
    selected_swatch = 0;
    show();
}
function swap(i,j,from) {
    // the left/right arrows
    // switch two swatches' places
    var tmp = swatchlist[i];
    swatchlist[i] = swatchlist[j];
    swatchlist[j] = tmp;
    selected_swatch = (j==from) ? i : j;
    show();
}
function move_to_start(i) {
    // the full-left arrow
    // move swatch to far left
    add_to_swatchlist( remove_from_swatchlist(i) );
    selected_swatch = 0;
    show();
}
function move_to_end(i) {
    // the full-right arrow
    // move swatch to the far right
    var swatch = remove_from_swatchlist(i);
    last_swatch++;
    swatchlist[last_swatch] = swatch;
    selected_swatch = last_swatch;
    show();
}
function insert(i,RRGGBB) {
    // called by most of the + icons (all the shades/complements)
    // inserts new swatch immediately before the clicked swatch
    build_and_insert_new_swatch(RRGGBB);
    if ( i == last_swatch ) {
        move_to_end(0);
    } else if ( i == 0 ) { // we're done
        selected_swatch = 0;
        show();
    } else { // put the new swatch where it belongs:
        var inserted_swatch = swatchlist[0];
        for (var j=0 ; j<=i ; j++ ) {
            swatchlist[j] = swatchlist[j*1+1];
        }
        swatchlist[i] = inserted_swatch;
        selected_swatch = i;
        show();
    }
}


// these next utility functions are called by a few others...


function add_to_swatchlist( swatch ) {
    // (called by other functions to insert a swatch)
    if ( last_swatch == null ) {
        last_swatch = 0;
        selected_swatch = 0;
        swatchlist[0] = swatch;
        return;
    } else if ( last_swatch < SWATCHES ) {
        last_swatch++;
        selected_swatch++;
    }
    for (var i=last_swatch ; i>0 ; i-- ) {
        swatchlist[i] = swatchlist[i-1];
    }
    swatchlist[0] = swatch;
}
function remove_from_swatchlist( index ) {
    // (called by other functions to remove a swatch)
    var tmp = swatchlist[index];
    if ( last_swatch == 0 ) {
        last_swatch = null;
        selected_swatch = null;
        swatchlist[0] = new Array(SWATCHES);
    } else {
        last_swatch--;
        if ( index < selected_swatch ) {
            selected_swatch--;
        } else if ( index == selected_swatch ) {
            selected_swatch = 0;
        }
    }
    for (var i=index ; i<=(1+1*last_swatch) ; i++) {
        swatchlist[i] = swatchlist[i*1+1];
    }
    swatchlist[last_swatch+1] = null;
    return tmp;
}
function valid_color( color ) {
    // take in an RRGGBB or RGB hex color
    // return RRGGBB form if valid hex-coded color,
    // or return '' if not a valid color
    if ( color.length == 3 ) {
        color = (
            color.substring(0,1) + color.substring(0,1) +
            color.substring(1,2) + color.substring(1,2) +
            color.substring(2,3) + color.substring(2,3)
        );
    } else if ( color.length != 6 ) {
        return '';
    }
    color = color.toUpperCase();
    for (var i=1 ; i <= 6 ; i++) {
        var digit = color.substring(i-1,i);
        // ordering of tests intended  to allow more frequent short circuit
        if ( digit!=0   && digit!='F' && digit!=9   && digit!=3   && 
             digit!='C' && digit!=6   && digit!=1   && digit!=2   && 
             digit!=4   && digit!=5   && digit!=7   && digit!=8   && 
             digit!='A' && digit!='B' && digit!='D' && digit!='E'
        ) {
            return '';
        }
    }
    return color;
}
function simulating_anything() {
    // are prefs set to simulate anything other than the actual color?
    // (can return true even if UI is switched out of simulation control)
    return(
        !(
            prefs.colorMonitor == 1
            &&
            prefs.colorVisionType == 'normal'
            &&
            prefs.gammac == 1
        )
    );
}
function build_and_insert_new_swatch( color ) {
    // called by other functions to create a new swatch for color
    // and insert at the start of the swatch list
    if ( last_swatch != null ) {
        // if we already have some swatches, 
        for (var j=0 ; j<=last_swatch ; j++) {
            // see if we already have one of this color...
            if ( color == swatchlist[j]['normal'] ) {
                // if so, duplicate it and save oodles of work
                add_to_swatchlist( swatchlist[j] );
                return;
            }
        }
    }
    var s = new Object();
    s.normal = color;
    // these are hex components:
    var RR = s.normal.substring(0,2);
    var GG = s.normal.substring(2,4);
    var BB = s.normal.substring(4,6);
    // these are decimal components:
    s.r = parseInt(RR,16);
    s.g = parseInt(GG,16);
    s.b = parseInt(BB,16);
    // next are our five "complement" permutations from RRGGBB:
    // color complements (permutations) appear in this order at swatch bottom:
    // d i e        permd, inv, perme
    // a b c        perma, permb, permc
    // the perm* values are at equivilant places in the other five chart sections
    // the invt value is the brightness invert of the color opposite the swatch on the chart
    s.prma = BB+RR+GG;
    s.prmb = BB+GG+RR;
    s.prmc = GG+BB+RR;
    s.prmd = GG+RR+BB;
    s.prme = RR+BB+GG;
    // The above default values work for only a certain class of colors.
    // we have to accomadate a few other color classes too.
    // some need colors constructed differently
    // some need colors re-arranged to get to our canonical arrangement
    // where the clockwise sequence matches the colorpicker palette
    var tmp; // used below
    if ( s.r == s.g && s.g != s.b ) { // aaaabb
        s.prmb = BB+BB+RR;
        s.prmd = BB+RR+BB;
        s.prme = RR+BB+BB;
    } else if ( s.r != s.g && s.g == s.b ) { // bbaaaa
        s.prmb = GG+RR+RR;
        s.prmc = GG+GG+RR;
        s.prmd = RR+RR+GG;
        s.prme = RR+GG+RR;
    } else if ( s.r != s.g && s.r == s.b ) { // aabbaa
        s.prmb = GG+RR+GG;
        s.prmd = RR+GG+GG;
        s.prme = GG+GG+RR;
    } else if (  ( s.r > s.b && s.b > s.g )  ||  ( s.g > s.b && s.b > s.r )  ) {
        tmp = s.prmb;
        s.prmb = s.prmd;
        s.prmd = tmp;
    } else if (  ( s.g > s.r && s.r > s.b )  ||  ( s.b > s.r && s.r > s.g )  ) {
        tmp = s.prmd;
        s.prmb = s.prme;
        s.prmd = tmp;
        s.prme = s.prmd;
    } // cases of the last remaining type work with default settings
    s.invt = (
        dec_to_hex( 255 - s.r )
        +
        dec_to_hex( 255 - s.g )
        +
        dec_to_hex( 255 - s.b )
    );
    s.more = (
        dec_to_hex( s.r*1 + 51 )
        +
        dec_to_hex( s.g*1 + 51 )
        +
        dec_to_hex( s.b*1 + 51 )
    );
    s.less = (
        dec_to_hex( s.r - 51 )
        +
        dec_to_hex( s.g - 51 )
        +
        dec_to_hex( s.b - 51 )
    );
    s.othr = (
        dec_to_hex(  255  -  parseInt( s.prmb.substring(0,2), 16 )  )
        +
        dec_to_hex(  255  -  parseInt( s.prmb.substring(2,4), 16 )  )
        +
        dec_to_hex(  255  -  parseInt( s.prmb.substring(4,6), 16 )  )
    );
    // determine rounded values for each r,g,b for safe,flor,ciel
    var sr = Math.round( s.r / 51 ) * 51; // we use these to get hex, and to get ceil/floor
    var sg = Math.round( s.g / 51 ) * 51;
    var sb = Math.round( s.b / 51 ) * 51;
    var h_sr = dec_to_hex( sr ); // use these for websafe hex code and color-blind versions
    var h_sg = dec_to_hex( sg );
    var h_sb = dec_to_hex( sb );
    s.safe = ( h_sr + h_sg + h_sb );
    s.name = lookup_data( h_sr, h_sg, h_sb );
    s.abbr   = s.name.substring( 0, 3 );
    s.name   = s.name.substring( 3, s.name.length );
    if ( s.normal != s.safe ) {
        s.abbr = '<em>~'+s.abbr+'</em>';
        var css_name = rrggbb_code_to_css_color_name( s.normal );
        if ( css_name.length ) {
            s.name = 'CSS2 name: <em>'+css_name+'</em>';
        } else {
            s.name = '<em>Custom Color</em> near '+s.name;
        }
    }
    // these next two are colors "half a web-safe interval" from
    // the web safe color, which round to the web-safe color in
    // browsers which round instead of dithering when they can't
    // display the actual color itself.
    s.ceil=(
        partial_ceil( sr ) + partial_ceil( sg ) + partial_ceil( sb )
    );
    s.flor=(
        partial_flor( sr ) + partial_flor( sg ) + partial_flor( sb )
    );
    s.sim = new Object();
    set_rendering_colors( s );
    s.fgnd = hex_to_fgnd( s.normal );
    add_to_swatchlist(s);
}
function hex_to_fgnd( RRGGBB ) {
    // hex RRGGBB color code to appropriate foreground color on that background
    // http://digilander.iol.it/WarZi/geoalgo.htm#RGB2Gray
    // added a bit of precision to the otherwise apparently common function
    return (
        Math.round(
            parseInt( RRGGBB.substring(0,2), 16 ) * .299 +
            parseInt( RRGGBB.substring(2,4), 16 ) * .587 +
            parseInt( RRGGBB.substring(4,6), 16 ) * .114
        ) > 127
    ) ? '000000' : 'FFFFFF';
}
function dec_to_hex( dec ) {
    // decimal color level to hexidecimal
    if ( dec <= 0 ) {
        return "00";
    } else if ( dec >= 255 ) {
        return "FF";
    }
    var result = parseInt(dec).toString(16).toUpperCase();
    if ( result.length == 1 ) {
        return( "0" + result );
    }
    return result;
}
function partial_ceil( colorpart ) {
    // given hex level, return dec level half-a-websafe-level higher
    if ( colorpart == 255 ) {
        return "FF";
    } else if ( colorpart == 204 ) {
        return "E5";
    } else if ( colorpart == 153 ) {
        return "B2";
    } else if ( colorpart == 102 ) {
        return "7F";
    } else if ( colorpart == 51 ) {
        return "4C";
    } else if ( colorpart == 0 ) {
        return "19";
    } else {
        alert(
            "function partial_ceil() passed unexpected input: "
            + colorpart + ". This should not happen!"
        );
        return "FF";
    }
}
function partial_flor( colorpart ) {
    // given hex level, return dec level half-a-websafe-level lower
    if ( colorpart == 0 ) {
        return "00";
    } else if ( colorpart == 51 ) {
        return "1A";
    } else if ( colorpart == 102 ) {
        return "4D";
    } else if ( colorpart == 153 ) {
        return "80";
    } else if ( colorpart == 204 ) {
        return "B3";
    } else if ( colorpart == 255 ) {
        return "E6";
    } else {
        alert(
            "function partial_flor() passed unexpected input: "
            + colorpart + ". This should not happen!"
        );
        return "FF";
    }
}


// this next bunch of functions concerns color simulation...


function set_rendering_colors( swatch ) {
    // determine how to render a single swatch, or all swatches
    // based on indicated simulation prefs
    if ( swatch ) {
        // user is adding a new swatch to the list
        // determine rendered color for just that one swatch
        // store value in the swatch
        swatch.code = calculate_rendered_color( swatch );
    } else {
        // we're re-drawing all the swatches
        // determine whether rendering context is the same or not
        if ( new_rendering_context() ) {
            // determine rendered colors for all swatches 
            // store values in swatches themselves
            for (var i=0 ; i <= last_swatch ; i++) {
                swatchlist[i].code = calculate_rendered_color( swatchlist[i] );
            }
            // upate rendr.* to reflect prefs for which rendered colors calculated
            rendr.colorMonitor    = prefs.colorMonitor;
            rendr.colorVisionType = prefs.colorVisionType;
            rendr.gammac          = prefs.gammac;
        } // else we don't need to do anything; swatches are still up-to-date
    }
}
function new_rendering_context() {
    return(
        (rendr.colorMonitor != prefs.colorMonitor)
        ||
        (rendr.colorVisionType != prefs.colorVisionType)
        ||
        (rendr.gammac != prefs.gammac)
    );
}
function calculate_rendered_color( swatch ) {
    // given one swatch, use prefs to calculate rendered color.
    // Set color-vision simulation colors for these settings, and
    // return the setting for the currently in-use vision type.
  //if (  !( prefs.gammac in swatch.sim )  ) {
    // !!! the above line is proper, but apparently not supported by IE5 and earlier
    // The line below works in IE5 in earlier but gives JS strict warnings in mozilla
    if ( swatch.sim[prefs.gammac] == null ) {
        // we've never calculated simulation colors for this color/gamma combo
        // Calculate all of them now...
        swatch.sim[prefs.gammac] = new Array(1);
        swatch.sim[prefs.gammac][0] = new Object(); // monochrome monitor
        swatch.sim[prefs.gammac][1] = new Object(); // full color monitor
        swatch.sim[prefs.gammac][1]['normal'] = gamma_corrected_code( swatch );
        swatch.sim[prefs.gammac][0]['normal'] = monochrome_code(
            swatch.sim[prefs.gammac][1]['normal']
        );
        var simcolors = color_blind_sims(
            parseInt( swatch.sim[prefs.gammac][1]['normal'].substring(0,2), 16 ),
            parseInt( swatch.sim[prefs.gammac][1]['normal'].substring(2,4), 16 ),
            parseInt( swatch.sim[prefs.gammac][1]['normal'].substring(4,6), 16 )
        );
        var t; // color blindness type
        for ( t in simcolors ) {
            var short_t = 'anom' + t.substring(0,2);
            swatch.sim[prefs.gammac][1][t] = simcolors[t];
            swatch.sim[prefs.gammac][0][t] = monochrome_code(
                swatch.sim[prefs.gammac][1][t]
            );
            swatch.sim[prefs.gammac][1][short_t] = anomylize_code(
                swatch.sim[prefs.gammac][1]['normal'],
                swatch.sim[prefs.gammac][1][t]
            );
            swatch.sim[prefs.gammac][0][short_t] = monochrome_code(
                swatch.sim[prefs.gammac][1][short_t]
            );
        }
        var v = 4; // seemed like an interesting weight. No idea about accuracy.
        var d = v*1 + 1; // anom's can vary widely, so don't worry too much about it.
        var m = parseInt( swatch.sim[prefs.gammac][0]['normal'].substring(0,2), 16 );
        swatch.sim[prefs.gammac][1]['anommo'] = (
            dec_to_hex(  ( m*v + swatch.r*1 )/d  )
            +
            dec_to_hex(  ( m*v + swatch.g*1 )/d  )
            +
            dec_to_hex(  ( m*v + swatch.b*1 )/d  )
        );
        swatch.sim[prefs.gammac][0]['anommo'] = monochrome_code(
            swatch.sim[prefs.gammac][1]['anommo']
        );
        swatch.sim[prefs.gammac][0]['monoch'] = swatch.sim[prefs.gammac][0]['normal'];
        swatch.sim[prefs.gammac][1]['monoch'] = swatch.sim[prefs.gammac][0]['normal'];
    }
    // return the code matching the current prefs:
    return swatch.sim[prefs.gammac][prefs.colorMonitor][prefs.colorVisionType];
}
function monochrome_code( rrggbb ) {
    var r = parseInt( rrggbb.substring(0,2), 16 );
    var g = parseInt( rrggbb.substring(2,4), 16 );
    var b = parseInt( rrggbb.substring(4,6), 16 );
    var m = Math.round( r*.299 + g*.587 + b*.114 );
    // http://digilander.iol.it/WarZi/geoalgo.htm#RGB2Gray
    // added a bit of precision to the otherwise apparently common function
    m = dec_to_hex( m );
    return( m+m+m );
}
function anomylize_code( rrggbb_original, rrggbb_filtered ) {
    var v = 1.75;
    /*
       v seemed like an interesting weight ratio. No idea about accuracy though.
       To do this right, it should happen in yuv (or similar) color space. However,
       with no sense of what would be accurate, there's little point in doing it
       the 'right way'. Anomylous vision types can fall anywhere in a broad range
       between normal vision and some form of color blindness. We'll never be
       correct for every case, so we'll just do the math the quick way...
    */
    var d = v*1 + 1;
    var ro = parseInt( rrggbb_original.substring(0,2), 16 );
    var go = parseInt( rrggbb_original.substring(2,4), 16 );
    var bo = parseInt( rrggbb_original.substring(4,6), 16 );
    var rf = parseInt( rrggbb_filtered.substring(0,2), 16 );
    var gf = parseInt( rrggbb_filtered.substring(2,4), 16 );
    var bf = parseInt( rrggbb_filtered.substring(4,6), 16 );
    return(
        dec_to_hex(  ( v*rf + ro*1 )/d  )
        +
        dec_to_hex(  ( v*gf + go*1 )/d  )
        +
        dec_to_hex(  ( v*bf + bo*1 )/d  )
    );
}
function gamma_corrected_code( c ) {
    // takes a color object with r,g,b properties (0..255)
    // returns an RRGGBB string, gamma corrected according to prefs
    return(
        dec_to_hex(  gamma_correct( c.r, prefs.gammac )  )
        +
        dec_to_hex(  gamma_correct( c.g, prefs.gammac )  )
        +
        dec_to_hex(  gamma_correct( c.b, prefs.gammac )  )
    );
}
function gamma_correct( level, gc ) {
    if ( level == 0 || level == 255 || gc == 1 ) {
        return level;
    } // else...
    return Math.pow( (level/255), rendr.gammac ) * 255;
}


// this is what you've been waiting for...
// show() draws the table full of swatches


function show() {
    // here we either draw the swatch list (or show rendering_area.html)
    if ( last_swatch == null ) {
        contentframe.renderspace.location = "rendering_area.html";
        return;
    }
    var d = contentframe.renderspace.document;
    var j; // used below to iterate over swatches
    if ( swatchlist[0].fgnd == null ) {
        last_swatch = null;
        selected_swatch = null;
        swatchlist = new Array(SWATCHES);
        d.open();
        d.writeln(
            '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"',
                '"http://www.w3.org/TR/1999/REC-html401-19991224/loose.dtd">',
            '<html><head><title>browser bug</title>',
            '</head>\n<body>\n',
                '<h1>Sorry!</h1>',
                '<p>',
                    'You will need to re-select your swatch colors.',
                '</p>',
                '<p>',
                    'It appears that through no fault of your own, you have',
                    'stumbled into a javascript implementation bug in your',
                    'web browser. Because of this bug, your browser will',
                    'forget some swatch information when you change the',
                    'size of the color-picking palette. The only way that',
                    'we can work around this bug is to clear out all of the',
                    'swatch information and ask you to re-pick your colors.',
                '</p>',
                '<p>',
                    'We apologize for the inconvenience. To avoid this bug',
                    'in your browser, you should select your prefered size',
                    'before you actually pick any swatch colors. This bug',
                    'has been confirmed in early 5.x versions of the Opera',
                    'web browser. There may be other affected browsers.',
                '</p>',
                '<p>',
                    'Note that Mozilla, Icab, Navigator, and Internet',
                    'Explorer browsers do not exhibit this bug.',
                '</p>',
                '<p>',
                    'Also note that Opera (if that is what you are using)',
                    'is not a recomended browser for this tool. Not only',
                    'does Opera forget your swatch information unexpectedly,',
                    'but it also ignores colspan attributes, making the',
                    'swatch layout much less functional. It will also',
                    'ignore javascript directives to set menu selections',
                    'and may have other bugs I had not yet encountered when',
                    'I gave up trying to get Opera to play nice. I will',
                    'attempt to support Opera in the future when they have',
                    'had more time to improve their software.',
                '</p>',
            '</body></html>'
        );
        d.close();
        return;
    }
    var usecolor = 'normal'; // default to color swatches normally
    if ( gui_state.controls == 'simulation' && simulating_anything() ) {
        set_rendering_colors(); // prepare swatches according to user prefs
        usecolor = 'code'; // use the code for the modified version of color
    }
    var fg = swatchlist[selected_swatch].fgnd;
    d.open();
    d.writeln(
        '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"',
            '"http://www.w3.org/TR/1999/REC-html401-19991224/loose.dtd">',
        '<html><head><title>selected colors</title>',
        '<script language="JavaScript">\n<!-- \n    function insert( x,y ) {  parent.parent.insert( x,y );  }\n// -->\n</script>\n',
        '</head>\n<body bgcolor="#000000" text="#',fg,'" vlink="#',fg,'" link="#',fg,'" alink="#',fg,'">\n'
    );
    // we're just in html->body
    // I'll be using comments like the above to track html element nesting.
    // We need to figure out how many columns our top cell (with first swatch's name) will span
    var header_colspan = last_swatch+1; // default covers all swatches (remember last_swatch is 0-based)
    // we add separator columns between identical swatches, so...
    if ( last_swatch > 0 ) {
        for ( j=1 ; j<=last_swatch ; j++) {
            if ( swatchlist[j-1].normal == swatchlist[j].normal ) {
                header_colspan++;
            }
        }
    }
    var pad = ' &#160;&#160;&#160;&#160; ';
    //!!! early opera 5.x browsers ignore colspan attributes below. Argh!
    d.writeln(
        '<br clear="all">',
        // begin table containing all the swatches. Some cells in this table are just to make nice borders.
        '<table border="0" cellpadding="2" cellspacing="0">\n',
            '<tr>\n',
                '<td colspan="',header_colspan*1+2,'" bgcolor="#',swatchlist[selected_swatch][usecolor],'">',
                    '<img src="img/pixel.gif" alt=" " align="left" border="0" width="1" height="1" hspace="1" vspace="1">',
                '</td>\n',
            '</tr>\n<tr valign="top" align="left">\n',
                '<td rowspan="2" bgcolor="#',swatchlist[selected_swatch][usecolor],'">',
                    '<img src="img/pixel.gif" alt=" " align="left" border="0" width="1" height="1" hspace="2" vspace="2">',
                '</td>\n<td colspan="',header_colspan,'" bgcolor="#',swatchlist[selected_swatch][usecolor],'">\n',
                    //'<font color="#',fg,'">',
                        // primary swatch's RRGGBB code, abreviation, and full name:
                        '<font size="+3"><strong>',
                            swatchlist[selected_swatch].normal,
                        '</strong></font>',
                        pad,'<big>',swatchlist[selected_swatch].abbr,'</big>',
                        pad,swatchlist[selected_swatch].name,pad,
                    //'</font>',
                '</td>\n<td rowspan="2" bgcolor="#',swatchlist[selected_swatch][usecolor],'">',
                    '<img src="img/pixel.gif" alt=" " align="left" border="0" width="1" height="1" hspace="2" vspace="2">',
                '</td>\n',
            '</tr>\n<tr valign="top">'
    ); // we're still in html->body->table->tr
    // All of these elements will remain unclosed for quite a while...
    // now, draw one td for each swatch. Inside that td, put an entire sub-table of swatch stuff...
    // We'll need these two strings for images... result is same size for each:
    var img_attr_for_icons = 'border="0" width="5" height="13" hspace="0" vspace="0"';
    var img_attr_for_blank = 'border="0" width="1" height="1" hspace="2" vspace="6"';
    for ( j=0 ; j<=last_swatch ; j++) {
        var code = swatchlist[j][usecolor];
        var forground = swatchlist[j].fgnd;
        var reversed = ( forground == '000000' ) ? 'FFFFFF' : '000000';
        var show_abbrev = (
                                '<strong><font color="#'+forground+'" size="-1">' +
                                    swatchlist[j].abbr +
                                '</font></strong>' +
                                // note: this swatch duplicator replaced the one about 130 lines below (20020225)
                                '&#160;<a href="javascript:parent.parent.copy_to_start('+j+')">' +
                                    '<img src="img/'+forground+'/pick.gif" alt="add another '+swatchlist[j].normal+' swatch" title="add another '+swatchlist[j].normal+' swatch" align="top" '+img_attr_for_icons+'>'+
                                '</a>'
        );
        var show_code = (
                                '<strong><font color="#'+forground+'">' +
                                    swatchlist[j].normal +
                                '</font></strong>'
        );
        if ( last_swatch == 0 ) {
            show_abbrev = pad;
            show_code = pad;
        } else if ( j>0 ) {
            if ( swatchlist[j-1].normal == swatchlist[j].normal ) { // identical to previous swatch
                var sep_color = swatchlist[selected_swatch][usecolor]; // use selected swatch color as separator
                if ( swatchlist[j].normal == swatchlist[selected_swatch].normal ) { // same as selected swatch
                    // use fgnd color as separator
                    sep_color = forground;
                }
                d.write('<td bgcolor="#',sep_color,'">');
                d.writeln(
                    '<table border="0" bgcolor="#',sep_color,'" cellpadding="0" cellspacing="0" align="center" width="100%">',
                        '<tr valign="top">\n',
                            '<td bgcolor="#',sep_color,'" align="center">',
                                '<img src="img/pixel.gif" alt=" " align="left" border="0" width="1" height="1" hspace="0" vspace="0">',
                            '</td>\n',
                        '</tr>\n',
                    '</table>'
                );
                d.write('</td>');
            }
        }
        var show_details = '';
        if (  j != selected_swatch  &&  (swatchlist[j].normal != swatchlist[selected_swatch].normal)  ) {
            show_details = (
                '<a href="javascript:parent.parent.view_details('+j+')">'
                +   '<img src="img/'+forground+'/up.gif" alt="get swatch info" title="get swatch info" align="left" '+img_attr_for_icons+'>'
                + '</a>'
            );
        } else {
            show_details = (
                '<img src="img/pixel.gif" alt=" " align="left" '+img_attr_for_blank+'>'
            );
        }
        d.write(
                '<td bgcolor="#',code,'">',
                    '<table border="0" bgcolor="#',code,'" cellpadding="3" cellspacing="2" align="center" width="100%">',
                        '<tr valign="top">\n',
                            '<td bgcolor="#',code,'" align="right">',
                                show_details,
                            '</td>\n<td align="center" bgcolor="#',code,'">',
                                show_code,
                            '</td>\n<td bgcolor="#',code,'" align="right">',
                                // remove this swatch
                                '<a href="javascript:parent.parent.remove('+j+')">',
                                    '<img src="img/'+forground+'/rm.gif" alt="remove swatch" title="remove swatch" align="right" '+img_attr_for_icons+'>',
                                '</a>',
                            '</td>\n',
                        '</tr>\n<tr valign="top">',
                            '<td bgcolor="#',code,'" align="left">'
        ); // we're still in html->body->table->tr->td->table->tr->td
        if (
            j == 0 // can't move the first swatch one to the left
            || swatchlist[j-1].normal == swatchlist[j].normal // no useless swapping
        ) {
            d.write(
                                '<img src="img/pixel.gif" alt=" " align="left" '+img_attr_for_blank+'>'
            );
        } else {
            d.write(
                                '<a href="javascript:parent.parent.swap('+"'"+j+"','"+(j-1)+"','"+j+"'"+')">',
                                    '<img src="img/'+forground+'/left.gif" alt="move swatch one place to the left" title="move swatch one place to the left" align="left" '+img_attr_for_icons+'>',
                                '</a>'
            );
        }
        d.write(
                            '</td>\n<td align="center" bgcolor="#',code,'">',
                                // abbreviation for this swatch
                                show_abbrev,
                            '</td>\n<td bgcolor="#',code,'" align="right">'
        ); // we're still in html->body->table->tr->td->table->tr->td
        if (
            j == last_swatch // can't move the last swatch one to the right
            || swatchlist[j+1].normal == swatchlist[j].normal // no useless swapping
        ) {
            d.write(
                                '<img src="img/pixel.gif" alt=" " align="right" '+img_attr_for_blank+'>'
            );
        } else {
        d.write(
                                '<a href="javascript:parent.parent.swap('+"'"+j+"','"+(j*1+1)+"','"+j+"'"+')">',
                                    '<img src="img/'+forground+'/right.gif" alt="move swatch one place to the right" title="move swatch one place to the right" align="right" '+img_attr_for_icons+'>',
                                '</a>'
            );
        }
        d.write(
                            '</td>\n',
                        '</tr>\n<tr valign="top">',
                            '<td bgcolor="#',code,'" align="left">'
        ); // we're still in html->body->table->tr->td->table->tr->td
        if (
            j == 0 // swatch is already at start
            || swatchlist[j-1].normal == swatchlist[j].normal // move controls to ends of runs
        ) {
            d.write(
                                '<img src="img/pixel.gif" alt=" " align="left" '+img_attr_for_blank+'>'
            );
        } else {
            d.write(
                                '<a href="javascript:parent.parent.move_to_start('+j+')">',
                                    '<img src="img/'+forground+'/first.gif" alt="move swatch to the far left" title="move swatch to the far left" align="left" '+img_attr_for_icons+'>',
                                '</a>'
            );
        }
        d.write(
                            '</td>\n<td align="center" bgcolor="#',code,'">',
                                '<strong><tt>'
        ); // we're still in html->body->table->tr->td->table->tr->td->strong->tt
        for (var k=0 ; k <= last_swatch ; k++) {
            // show how each color looks with this swatch as background:
            if (  k == 0  ||  k == j  ||  swatchlist[k].normal != swatchlist[k-1].normal ) {
                if ( k == j) {
                    d.write(
                                    '<font color="#',forground,'"><small>(',swatchlist[k].normal,')</small></font>',
                                        // note: this swatch duplicator replaced the one about 130 lines above (20020225)
                                        //'<a href="javascript:parent.parent.copy_to_start('+j+')">',
                                        //    '<img src="img/'+forground+'/pick.gif" alt="add another '+swatchlist[j].normal+' swatch" title="add another '+swatchlist[j].normal+' swatch" align="top" '+img_attr_for_icons+'>',
                                        //'</a>',
                                    '<br>'
                    );
                } else {
                    d.write(
                                    '<font color="#',swatchlist[k][usecolor],'">',
                                        swatchlist[k].normal,
                                    '</font><br>'
                    );
                }
            } // else, we just did that color last time... don't repeat it here
        }
        d.write(
                                '</tt></strong>',
                            '</td><td bgcolor="#',code,'" align="right">'
        );
        if (
            j == last_swatch // swatch is already at end
            || swatchlist[j+1].normal == swatchlist[j].normal // move controls to ends of runs
        ) {
            d.write(
                                '<img src="img/pixel.gif" alt=" " align="right" '+img_attr_for_blank+'>'
            );
        } else {
            d.write(
                                '<a href="javascript:parent.parent.move_to_end('+j+')">',
                                    '<img src="img/'+forground+'/last.gif" alt="move swatch to the far right" title="move swatch to the far right" align="right" '+img_attr_for_icons+'>',
                                '</a>'
            );
        }
        d.writeln(
                            '</td>\n',
                        '</tr>'
        ); // we're still in html->body->table->tr->td->table
        d.writeln();
        if (  gui_state.controls != 'simulation'  ) {
            // show shades and/or complements if user wants us too
            // (we won't show either when in a simulation mode)
            if ( prefs.showShades ) {
                // display some different brightness (explained a bit lower in the HTML part)
                // do this one first so we can reference safe_color more conveniently:
                var safe_color = swatchlist[j].safe;
                var safe_image = hex_to_fgnd(safe_color) + '/safe.gif" alt="add nearest websafe color ('+swatchlist[j].safe+')" title="add nearest websafe color ('+swatchlist[j].safe+')" align="center" '+img_attr_for_icons;
                if ( safe_color == code ) {
                    safe_color = code;
                    safe_image = 'pixel.gif" alt=" " align="center" '+img_attr_for_blank;
                }
                var ceil_color = swatchlist[j].ceil;
                var ceil_image = hex_to_fgnd(ceil_color) + '/pick.gif" alt="add a '+ceil_color+' swatch" title="add a '+ceil_color+' swatch" align="left" '+img_attr_for_icons;
                if ( ceil_color == safe_color || ceil_color == code ) {
                    ceil_color = code;
                    ceil_image = 'pixel.gif" alt=" " align="left" '+img_attr_for_blank;
                }
                // web safe color would normally go in here, but we did it first
                var flor_color = swatchlist[j].flor;
                var flor_image = hex_to_fgnd(flor_color) + '/pick.gif" alt="add a '+flor_color+' swatch" title="add a '+flor_color+' swatch" align="right" '+img_attr_for_icons;
                if ( flor_color == safe_color || flor_color == code ) {
                    flor_color = code;
                    flor_image = 'pixel.gif" alt=" " align="right" '+img_attr_for_blank;
                }
                var more_color = swatchlist[j].more;
                var more_image = hex_to_fgnd(more_color) + '/pick.gif" alt="add a '+more_color+' swatch" title="add a '+more_color+' swatch" align="left" '+img_attr_for_icons;
                if ( more_color == safe_color || more_color == code ) {
                    more_color = code;
                    more_image = 'pixel.gif" alt=" " align="left" '+img_attr_for_blank;
                }
                var othr_color = swatchlist[j].othr;
                var othr_image = hex_to_fgnd(othr_color) + '/pick.gif" alt="add a '+othr_color+' swatch" title="add a '+othr_color+' swatch" align="center" '+img_attr_for_icons;
                if ( othr_color == code ) {
                    othr_color = code;
                    othr_image = 'pixel.gif" alt=" " align="center" '+img_attr_for_blank;
                }
                var less_color = swatchlist[j].less;
                var less_image = hex_to_fgnd(less_color) + '/pick.gif" alt="add a '+less_color+' swatch" title="add a '+less_color+' swatch" align="right" '+img_attr_for_icons;
                if ( less_color == safe_color || less_color == code ) {
                    less_color = code;
                    less_image = 'pixel.gif" alt=" " align="right" '+img_attr_for_blank;
                }
                d.writeln(
                        '<tr valign="top">',
                            '<td bgcolor="#',ceil_color,'" align="left">',
                                // add swatch for a color half a shade lighter (rounds down to web-safe of current swatch)
                                '<a href="javascript:insert('+"'"+j+"','"+ceil_color+"'"+')">',
                                    '<img src="img/'+ceil_image+'>',
                                '</a>',
                            '</td>\n<td bgcolor="#',safe_color,'" align="center">',
                                // add swatch for the websafe color closest to this swatch's color
                                '<a href="javascript:insert('+"'"+j+"','"+safe_color+"'"+')">',
                                    '<img src="img/'+safe_image+'>',
                                '</a>',
                            '</td>\n<td bgcolor="#',flor_color,'" align="right">',
                                // add swatch for a color half a shade darker (rounds up to web-safe of current swatch)
                                '<a href="javascript:insert('+"'"+j+"','"+flor_color+"'"+')">',
                                    '<img src="img/'+flor_image+'>',
                                '</a>',
                            '</td>\n',
                        '</tr>\n<tr valign="top">',
                            '<td bgcolor="#',more_color,'" align="left">',
                                // add swatch for a color a full shade lighter ("shade" = FF - CC in hex)
                                '<a href="javascript:insert('+"'"+j+"','"+more_color+"'"+')">',
                                    '<img src="img/'+more_image+'>',
                                '</a>',
                            '</td>\n<td bgcolor="#',othr_color,'" align="center">',
                                // add swatch for the color with just the inverse brightness of the current swatch's color
                                '<a href="javascript:insert('+"'"+j+"','"+othr_color+"'"+')">',
                                    '<img src="img/'+othr_image+'>',
                                '</a>',
                            '</td>\n<td bgcolor="#',less_color,'" align="right">',
                                // add swatch for a color a full shade darker ("shade" = FF - CC in hex)
                                '<a href="javascript:insert('+"'"+j+"','"+less_color+"'"+')">',
                                    '<img src="img/'+less_image+'>',
                                '</a>',
                            '</td>\n',
                        '</tr>'
                ); // we're still in html->body->table->tr->td->table
            } // else not showing lighter/darker shades in the swatch
            if ( prefs.showPermutations ) {
                // display some color complements/permutations
                // the perm* colors are the five colors in equivilant places in the chart
                // the invt color is the brightness inverse of the color at the opposite place in the chart
                /*
                    these colors are arranged as follows... the A..E ordering is a historical accident...
                            
                            permD Invt  permE
                            permA permB permC
                */
                // skip it if swatch is black, white, or grey
                if (
                    code == '000000' ||
                    code == '333333' ||
                    code == '666666' ||
                    code == '999999' ||
                    code == 'CCCCCC' ||
                    code == 'FFFFFF'
                ) {
                    d.writeln( // empty rows... grey is grey is grey... no permutations for grey
                        '<tr valign="top">',
                            '<td bgcolor="#',code,'" align="center" colspan="3">',
                                    '<img src="img/pixel.gif" alt=" " align="middle" '+img_attr_for_blank+'>',
                            '</td>',
                        '</tr>\n<tr valign="top">',
                            '<td bgcolor="#',code,'" align="center" colspan="3">',
                                    '<img src="img/pixel.gif" alt=" " align="middle" '+img_attr_for_blank+'>',
                            '</td>',
                        '</tr>'
                    ); // we're still in html->body->table->tr->td->table
                } else { // we've got color in our swatch...
                    var prmb_color = swatchlist[j].prmb;
                    var prmb_image = hex_to_fgnd(prmb_color) + '/pick';
                    var prmb_attrb = 'alt="add a '+swatchlist[j].prmb+' swatch" title="add a '+swatchlist[j].prmb+' swatch" '+img_attr_for_icons;
                    if ( prmb_color == swatchlist[j].invt ) {
                        prmb_color = code;
                        prmb_image = 'pixel';
                        prmb_attrb = 'alt=" " '+img_attr_for_blank;
                    }
                    d.writeln(
                        '<tr valign="top">',
                            '<td bgcolor="#',swatchlist[j].prmd,'" align="left">',
                                '<a href="javascript:insert('+"'"+j+"','"+swatchlist[j].prmd+"'"+')">',
                                    '<img src="img/'+hex_to_fgnd(swatchlist[j].prmd)+'/pick.gif" alt="add a '+swatchlist[j].prmd+' swatch" title="add a '+swatchlist[j].prmd+' swatch" align="left" '+img_attr_for_icons+'>',
                                '</a>',
                            '</td>\n<td bgcolor="#',swatchlist[j].invt,'" align="center">',
                                '<a href="javascript:insert('+"'"+j+"','"+swatchlist[j].invt+"'"+')">',
                                    '<img src="img/'+hex_to_fgnd(swatchlist[j].invt)+'/pick.gif" alt="add a '+swatchlist[j].invt+' swatch" title="add a '+swatchlist[j].invt+' swatch" align="middle" '+img_attr_for_icons+'>',
                                '</a>',
                            '</td>\n<td bgcolor="#',swatchlist[j].prme,'" align="right">',
                                '<a href="javascript:insert('+"'"+j+"','"+swatchlist[j].prme+"'"+')">',
                                    '<img src="img/'+hex_to_fgnd(swatchlist[j].prme)+'/pick.gif" alt="add a '+swatchlist[j].prme+' swatch" title="add a '+swatchlist[j].prme+' swatch" align="right" '+img_attr_for_icons+'>',
                                '</a>',
                            '</td>',
                        '</tr>\n<tr valign="top">',
                            '<td bgcolor="#',swatchlist[j].prma,'" align="left">',
                                '<a href="javascript:insert('+"'"+j+"','"+swatchlist[j].prma+"'"+')">',
                                    '<img src="img/'+hex_to_fgnd(swatchlist[j].prma)+'/pick.gif" alt="add a '+swatchlist[j].prma+' swatch" title="add a '+swatchlist[j].prma+' swatch" align="left" '+img_attr_for_icons+'>',
                                '</a>',
                            '</td>\n<td bgcolor="#',prmb_color,'" align="center">',
                                '<a href="javascript:insert('+"'"+j+"','"+prmb_color+"'"+')">',
                                    '<img src="img/'+prmb_image+'.gif" align="middle" '+prmb_attrb+'>',
                                '</a>',
                            '</td>\n<td bgcolor="#',swatchlist[j].prmc,'" align="right">',
                                '<a href="javascript:insert('+"'"+j+"','"+swatchlist[j].prmc+"'"+')">',
                                    '<img src="img/'+hex_to_fgnd(swatchlist[j].prmc)+'/pick.gif" alt="add a '+swatchlist[j].prmc+' swatch" title="add a '+swatchlist[j].prmc+' swatch" align="right" '+img_attr_for_icons+'>',
                                '</a>',
                            '</td>\n',
                        '</tr>'
                    ); // we're still in html->body->table->tr->td->table
                }
            } // else we're not showing color complements/perumutations in the swatch
            if ( !prefs.showPermutations && !prefs.showShades ) {
                // we could use a placeholder at the bottom of our swatch...
                d.writeln(
                            '<tr valign="top">',
                                '<td colspan="3" bgcolor="#',swatchlist[j].normal,'" align="center">',
                                    '<img src="img/pixel.gif" alt=" " align="middle" '+img_attr_for_blank+'>',
                                '</td>\n',
                            '</tr>'
                ); // we're still in html->body->table->tr->td->table
            }
        } else { // we're probably in a simulation mode
            // we do this when we're in a simulation mode, so user can see which color is which
            // start off assuming that we're in simulation mode:
            var contents = '<font size="-2" color="#'+forground+'">(true color)</font>';
            if ( !simulating_anything() ) {
                // otherwise, this is just a bit of extra padding:
                contents = '<img src="img/pixel.gif" alt=" " align="middle" '+img_attr_for_blank+'>';
            }
            d.writeln(
                        '<tr valign="top">',
                            '<td colspan="3" bgcolor="#',swatchlist[j].normal,'" align="center">',
                                contents,
                            '</td>\n',
                        '</tr>'
            ); // we're still in html->body->table->tr->td->table
        }
        // now close out this swatch...
        d.writeln(
                    '</table>\n',
                '</td>'
        ); // we're still in html->body->table->tr
    } // repeat for each swatch in the row
    // now close everything out, add some table padding, and quite brief instructions:
    d.write(
            '</tr><tr align="center">',
                '<td colspan="',header_colspan*1+2,'" bgcolor="#',swatchlist[selected_swatch][usecolor],'">',
                    '<img src="img/pixel.gif" alt=" " align="left" '+img_attr_for_blank+'><br>',
                    '<small>In early development: <a target="_top" href="http://colorfilter.wickline.org/colorblind/filter/">',
                        'see your actual web site through colorblind eyes',
                    '</a></small>',
                '</td>',
            '</tr>',
        '</table>\n',
        '<a href="http://aware.hwg.org/" target="_top"><img vspace="60" src="img/return_to_awareness.gif" border="0" height="50" width="235" alt="return to aware.hwg.org" title="return to aware.hwg.org" hspace="10"></a>\n',
        '</body>\n</html>\n\n'
    );
    d.close();
}


// these next few replace the image in the colorpicker with an appropriate
// normal or colorblind version...


function update_colorpicker_image() {
    var cvt;
    if ( gui_state.controls == 'simulation' ) {
        cvt = prefs.colorVisionType;
    } else {
        cvt = 'normal'
    }
    contentframe.palette.document.images[0].src = 'img/palette/' + cvt + '/' + gui_state.size + '.gif';
}



/*
    This next bunch of functions and constants (down to and including the
    color_blind_sims() function) are courtesy of Thomas G. Wolfmaier of the
    Human-Computer Interaction Resource Network at http://www.hcirn.com/
    I read a web page discussing some of his work at
        http://www.InternetTG.org/newsletter/mar99/color_challenged_table.html
    and initially created a look-up table for color-blind versions of web
    safe colors from that article. I later wanted to provide accurate versions
    of non-web-safe colors as well, and asked Mr. Wolfmaier if he would
    be willing to share his code. He agreed, and in fact gave me access to the
    code in two versions: a java class and an excel spreadsheet.
    
    I had ran into a little bug in translating the java version (I now think
    that the java version had the bug, so I shouldn't be suprised that the
    translation was buggy), so I translated the spreadsheet. Being a perl guy,
    I first translated the spreadsheet to perl, and the translated the perl to
    javascript. Below is the result.
    
    In his source, TW credits Chris Lilley's algorithmic suggestions at:
        http://www.research.microsoft.com/~hollasch/cgindex/color/color-blind.html
        ( Chris Lilley is http://www.w3.org/People/chris/ )
    for orrienting him toward this solution. The text there is quite helpful
    in following the code. Also useful is information on the CIE XYZ (and
    related Yuv) color spaces which can be found at http://www.hcirn.com/
    
*/


function Color() { // object constructor
    // a convenient way to access color coordinates in a
    // variety of color spaces, and to translate between two
    this.rgb_from_xyz = Color_rgb_from_xyz;
    this.xyz_from_rgb = Color_xyz_from_rgb;
}

function Color_xyz_from_rgb() { // object method
    // values are not as precise as possible (see below) ...
    this.x = ( 0.4306*this.r + 0.3416*this.g + 0.1783*this.b );
    this.y = ( 0.2220*this.r + 0.7067*this.g + 0.0713*this.b );
    this.z = ( 0.0202*this.r + 0.1296*this.g + 0.9392*this.b );
    return this;
    /* I sacrificed a bit of precision...
       original values from TW's source: (java and excel were identical)
       this.x = ( 0.430574*this.r + 0.341550*this.g + 0.178325*this.b );
       this.y = ( 0.222015*this.r + 0.706655*this.g + 0.071330*this.b );
       this.z = ( 0.020183*this.r + 0.129553*this.g + 0.939180*this.b );
    */
}
function Color_rgb_from_xyz() { // object method
    // values are not as precise as possible (see below) ...
    this.r = (  3.0632*this.x - 1.3933*this.y - 0.4758*this.z );
    this.g = ( -0.9692*this.x + 1.8760*this.y + 0.0416*this.z );
    this.b = (  0.0679*this.x - 0.2289*this.y + 1.0693*this.z );
    return this;
    /* I sacrificed a bit of precision...
       original values from TW's java source:
       this.r = (  3.063218*this.x - 1.393325*this.y - 0.475802*this.z );
       this.g = ( -0.969243*this.x + 1.875966*this.y + 0.041555*this.z );
       this.b = (  0.067871*this.x - 0.228834*this.y + 1.069251*this.z );
       original values from TW's excel source:
       this.r = (  3.063219*this.x - 1.393325*this.y - 0.475802*this.z );
       this.g = ( -0.969245*this.x + 1.875968*this.y + 0.041555*this.z );
       this.b = (  0.067872*this.x - 0.228834*this.y + 1.069251*this.z );
    */
}
/*
    !!! note to self:
        is the white point tied to the gamma?
        if not, can we start doing gamma translation in color_blind_sims()?
            (instead of after the fact)
        if so, can we find other white points and use them instead of assuming PC?
*/
var gamma = 2.2;
// white point xyz coords:
var wx =  0.312713;  var wy = 0.329016;  var wz = 0.358271;
var blind = new Object();
blind.protan = new Object();
    blind.protan.cpu = 0.735; // confusion point, u coord
    blind.protan.cpv = 0.265; // confusion point, v coord
    blind.protan.abu = 0.115807; // color axis begining point (473nm), u coord
    blind.protan.abv = 0.073581; // color axis begining point (473nm), v coord
    blind.protan.aeu = 0.471899; // color axis ending point (574nm), u coord
    blind.protan.aev = 0.527051; // color axis ending point (574nm), v coord
blind.deutan = new Object();
    blind.deutan.cpu =  1.14; // confusion point, u coord
    blind.deutan.cpv = -0.14; // confusion point, v coord
    blind.deutan.abu = 0.102776; // color axis begining point (477nm), u coord
    blind.deutan.abv = 0.102864; // color axis begining point (477nm), v coord
    blind.deutan.aeu = 0.505845; // color axis ending point (579nm), u coord
    blind.deutan.aev = 0.493211; // color axis ending point (579nm), v coord
blind.tritan = new Object();
    blind.tritan.cpu =  0.171; // confusion point, u coord
    blind.tritan.cpv = -0.003; // confusion point, v coord
    blind.tritan.abu = 0.045391; // color axis begining point (490nm), u coord
    blind.tritan.abv = 0.294976; // color axis begining point (490nm), v coord
    blind.tritan.aeu = 0.665764; // color axis ending point (610nm), u coord
    blind.tritan.aev = 0.334011; // color axis ending point (610nm), v coord
var t; // type of color blindness
for ( t in blind ) {
    // slope of the color axis:
    blind[t].am = (
        ( blind[t].aev - blind[t].abv )
        /
        ( blind[t].aeu - blind[t].abu )
    );
    // "y-intercept" of axis (actually on the "v" axis at u=0)
    blind[t].ayi = blind[t].abv  -  blind[t].abu * blind[t].am;
}
/*

    The color_blind_sims() JavaScript function in the is
    copyright (c) 2000-2001 by Matthew Wickline and the
    Human-Computer Interaction Resource Network ( http://hcirn.com/ ).
    
    The color_blind_sims() function is used with the permission of
    Matthew Wickline and HCIRN, and is freely available for non-commercial
    use. For commercial use, please contact the
    Human-Computer Interaction Resource Network ( http://hcirn.com/ ).
    (This notice constitutes permission for commercial use from Matthew
    Wickline, but you must also have permission from HCIRN.)
    Note that use of the color laboratory hosted at aware.hwg.org does
    not constitute commercial use of the <code>color_blind_sims()</code>
    function. However, use or packaging of that function (or a derivative
    body of code) in a for-profit piece or collection of software, or text,
    or any other for-profit work <em>shall</em> constitute commercial use.

*/
function color_blind_sims( r,g,b ) {
    // return colorblind versions of color
    // takes 0..255 rgb values (not validated!)
    // returns hash of rrggbb values
    //
    // map RGB input into XYZ space...
    var c = new Color;
    c.r = Math.pow( r/255, gamma );
    c.g = Math.pow( g/255, gamma );
    c.b = Math.pow( b/255, gamma );
    c.xyz_from_rgb();
    var sum_xyz = c.x + c.y + c.z;
    // map into uvY space...
    c.u = 0;  c.v = 0;
    if ( sum_xyz != 0 ) {
        c.u = c.x / sum_xyz;
        c.v = c.y / sum_xyz;
    }
    // find neutral grey at this luminosity (we keep the same Y value)
    var nx = wx * c.y / wy;
    var nz = wz * c.y / wy;
    var sim = new Object(); // simulations results will be stored here
    // the following variables will be recycled within the for loop...
    // (these variables will be described as they get used)
    var clm;  var clyi;
    var s = new Color();  var d = new Color();
    var adjust;  var adjr;  var adjg;  var adjb;  
    d.y = 0; // we're always at the same Y value, so delta Y is zero
    for ( t in blind ) { // for each type of color blindness...
        // cl is "confusion line" between our color and the confusion point
        // clm is cl's slope, and clyi is cl's "y-intercept" (actually on the "v" axis at u=0)
        if ( c.u < blind[t].cpu ) {
            clm = (blind[t].cpv - c.v) / (blind[t].cpu - c.u);
        } else {
            clm = (c.v - blind[t].cpv) / (c.u - blind[t].cpu);
        }
        //clm = (  (c.u < blind[t].cpu)
        //    ? (  (blind[t].cpv - c.v) / (blind[t].cpu - c.u)  )
        //    : (  (c.v - blind[t].cpv) / (c.u - blind[t].cpu)  )
        //);
        clyi = c.v -  c.u * clm;
        // find the change in the u and v dimensions (no Y change)
        d.u = (blind[t].ayi - clyi) / (clm - blind[t].am);
        d.v = (clm * d.u) + clyi;
        // find the simulated color's XYZ coords
        s.x = d.u * c.y / d.v;
        s.y = c.y;
        s.z = ( 1 - (d.u+d.v) ) * c.y / d.v;
        s.rgb_from_xyz(); // and then try to plot the RGB coords
        // note the RGB differences between sim color and our neutral color
        d.x = nx - s.x;
        d.z = nz - s.z;
        d.rgb_from_xyz();
        // find out how much to shift sim color toward neutral to fit in RGB space:
        adjr = d.r  ?  ( (s.r<0 ? 0 : 1) - s.r ) / d.r  :  0;
        adjg = d.g  ?  ( (s.g<0 ? 0 : 1) - s.g ) / d.g  :  0;
        adjb = d.b  ?  ( (s.b<0 ? 0 : 1) - s.b ) / d.b  :  0;
        adjust = Math.max(
            (  ( adjr>1 || adjr<0 )   ?   0   :   adjr  ),
            (  ( adjg>1 || adjg<0 )   ?   0   :   adjg  ),
            (  ( adjb>1 || adjb<0 )   ?   0   :   adjb  )
        );
        // now shift *all* three proportional to the greatest shift...
        s.r = s.r + ( adjust * d.r );
        s.g = s.g + ( adjust * d.g );
        s.b = s.b + ( adjust * d.b );
        // and then save the resulting simulated color...
        sim[t] = (
            dec_to_hex(
                255*(
                    s.r <= 0  ?  0  :
                    s.r >= 1  ?  1  :
                    Math.pow( s.r, 1/gamma )
                )
            )+dec_to_hex(
                255*(
                    s.g <= 0  ?  0  :
                    s.g >= 1  ?  1  :
                    Math.pow( s.g, 1/gamma )
                )
            )+dec_to_hex(
                255*(
                    s.b <= 0  ?  0  :
                    s.b >= 1  ?  1  :
                    Math.pow( s.b, 1/gamma )
                )
            )
        );
    }
    return sim; // return all simulated versions at once
}


/*
 * 
 * Our final function is a giant look-up table with an entry for every web-safe
 * color. Call with websafe RR GG BB hex values, and get back (in one string)
 *      abreviation for color name (as three characters, possibly including spaces)
 *      full color name, occupying the rest of the string
 * 
 * The color names and abbreviations were taken from the imagemap calls in the
 * original color lab:
 *      http://www.visibone.com/colorlab/
 *      thanks to Bob Stein
 * 
 * The color-blind version were taken from an internetworking article:
 *      http://www.InternetTG.org/newsletter/mar99/color_challenged_table.html
 *      thanks to Thomas G. Wolfmaier
 * 
 * I do plan to eventually replace the color-blind look-up data with actual
 * calculated values (so that we don't have to look up based on the nearest
 * web-safe color) using algorithms from Mr. Wolfmaier (translating either
 * his java or spreadsheet calculation functions to perl and javascript).
 * In his source, he credits Chris Lilley's algorithmic suggestions at:
 *     http://www.research.microsoft.com/~hollasch/cgindex/color/color-blind.html
 * but the code is Mr. Wolfmaier's own. I have his permission to port it.
 * I just haven't yet done it and don't know whether javascript will be able
 * to do the required math in a sufficiently speedy manner. We'll see.
 * 
 */


function lookup_data( r,g,b ) {
if(r=='00'){if(g=='00'){if(b=='00'){return(' K Black');}
if(b=='33'){return('OWBObscure Weak Blue');}
if(b=='66'){return('ODBObscure Dull Blue');}
if(b=='99'){return('DFBDark Faded Blue');}
if(b=='CC'){return('DHBDark Hard Blue');}
if(b=='FF'){return(' B Blue');}
}if(g=='33'){if(b=='00'){return('OWGObscure Weak Green');}
if(b=='33'){return('OWCObscure Weak Cyan');}
if(b=='66'){return('ODAObscure Dull Azure');}
if(b=='99'){return('DABDark Azure Blue');}
if(b=='CC'){return('DBADark Blue Azure');}
if(b=='FF'){return('BBABlue Blue Azure');}
}if(g=='66'){if(b=='00'){return('ODGObscure Dull Green');}
if(b=='33'){return('ODTObscure Dull Teal');}
if(b=='66'){return('ODCObscure Dull Cyan');}
if(b=='99'){return('DACDark Azure Cyan');}
if(b=='CC'){return('DHADark Hard Azure');}
if(b=='FF'){return('AABAzure Azure Blue');}
}if(g=='99'){if(b=='00'){return('DFGDark Faded Green');}
if(b=='33'){return('DTGDark Teal Green');}
if(b=='66'){return('DTCDark Teal Cyan');}
if(b=='99'){return('DFCDark Faded Cyan');}
if(b=='CC'){return('DCADark Cyan Azure');}
if(b=='FF'){return('AACAzure Azure Cyan');}
}if(g=='CC'){if(b=='00'){return('DHGDark Hard Green');}
if(b=='33'){return('DGTDark Green Teal');}
if(b=='66'){return('DHTDark Hard Teal');}
if(b=='99'){return('DCTDark Cyan Teal');}
if(b=='CC'){return('DHCDark Hard Cyan');}
if(b=='FF'){return('CCACyan Cyan Azure');}
}if(g=='FF'){if(b=='00'){return(' G Green');}
if(b=='33'){return('GGTGreen Green Teal');}
if(b=='66'){return('TTGTeal Teal Green');}
if(b=='99'){return('TTCTeal Teal Cyan');}
if(b=='CC'){return('CCTCyan Cyan Teal');}
if(b=='FF'){return(' C Cyan');}
}}if(r=='33'){if(g=='00'){if(b=='00'){return('OWRObscure Weak Red');}
if(b=='33'){return('OWMObscure Weak Magenta');}
if(b=='66'){return('ODVObscure Dull Violet');}
if(b=='99'){return('DVBDark Violet Blue');}
if(b=='CC'){return('DBVDark Blue Violet');}
if(b=='FF'){return('BBVBlue Blue Violet');}
}if(g=='33'){if(b=='00'){return('OWYObscure Weak Yellow');}
if(b=='33'){return(' OGObscure Gray');}
if(b=='66'){return('DWBDark Weak Blue');}
if(b=='99'){return('DDBDark Dull Blue');}
if(b=='CC'){return('MFBMedium Faded Blue');}
if(b=='FF'){return('LHBLight Hard Blue');}
}if(g=='66'){if(b=='00'){return('ODSObscure Dull Spring');}
if(b=='33'){return('DWGDark Weak Green');}
if(b=='66'){return('DWCDark Weak Cyan');}
if(b=='99'){return('DDADark Dull Azure');}
if(b=='CC'){return('MABMedium Azure Blue');}
if(b=='FF'){return('LBALight Blue Azure');}
}if(g=='99'){if(b=='00'){return('DSGDark Spring Green');}
if(b=='33'){return('DDGDark Dull Green');}
if(b=='66'){return('DDTDark Dull Teal');}
if(b=='99'){return('DDCDark Dull Cyan');}
if(b=='CC'){return('MACMedium Azure Cyan');}
if(b=='FF'){return('LHALight Hard Azure');}
}if(g=='CC'){if(b=='00'){return('DGSDark Green Spring');}
if(b=='33'){return('MFGMedium Faded Green');}
if(b=='66'){return('MTGMedium Teal Green');}
if(b=='99'){return('MTCMedium Teal Cyan');}
if(b=='CC'){return('MFCMedium Faded Cyan');}
if(b=='FF'){return('LCALight Cyan Azure');}
}if(g=='FF'){if(b=='00'){return('GGSGreen Green Spring');}
if(b=='33'){return('LHGLight Hard Green');}
if(b=='66'){return('LGTLight Green Teal');}
if(b=='99'){return('LHTLight Hard Teal');}
if(b=='CC'){return('LCTLight Cyan Teal');}
if(b=='FF'){return('LHCLight Hard Cyan');}
}}if(r=='66'){if(g=='00'){if(b=='00'){return('ODRObscure Dull Red');}
if(b=='33'){return('ODPObscure Dull Pink');}
if(b=='66'){return('ODMObscure Dull Magenta');}
if(b=='99'){return('DVMDark Violet Magenta');}
if(b=='CC'){return('DHVDark Hard Violet');}
if(b=='FF'){return('VVBViolet Violet Blue');}
}if(g=='33'){if(b=='00'){return('ODOObscure Dull Orange');}
if(b=='33'){return('DWRDark Weak Red');}
if(b=='66'){return('DWMDark Weak Magenta');}
if(b=='99'){return('DDVDark Dull Violet');}
if(b=='CC'){return('MVBMedium Violet Blue');}
if(b=='FF'){return('LBVLight Blue Violet');}
}if(g=='66'){if(b=='00'){return('ODYObscure Dull Yellow');}
if(b=='33'){return('DWYDark Weak Yellow');}
if(b=='66'){return(' DGDark Gray');}
if(b=='99'){return('MWBMedium Weak Blue');}
if(b=='CC'){return('LDBLight Dull Blue');}
if(b=='FF'){return('LFBLight Faded Blue');}
}if(g=='99'){if(b=='00'){return('DSYDark Spring Yellow');}
if(b=='33'){return('DDSDark Dull Spring');}
if(b=='66'){return('MWGMedium Weak Green');}
if(b=='99'){return('MWCMedium Weak Cyan');}
if(b=='CC'){return('LDALight Dull Azure');}
if(b=='FF'){return('LABLight Azure Blue');}
}if(g=='CC'){if(b=='00'){return('DHSDark Hard Spring');}
if(b=='33'){return('MSGMedium Spring Green');}
if(b=='66'){return('LDGLight Dull Green');}
if(b=='99'){return('LDTLight Dull Teal');}
if(b=='CC'){return('LDCLight Dull Cyan');}
if(b=='FF'){return('LACLight Azure Cyan');}
}if(g=='FF'){if(b=='00'){return('SSGSpring Spring Green');}
if(b=='33'){return('LGSLight Green Spring');}
if(b=='66'){return('LFGLight Faded Green');}
if(b=='99'){return('LTGLight Teal Green');}
if(b=='CC'){return('LTCLight Teal Cyan');}
if(b=='FF'){return('LFCLight Faded Cyan');}
}}if(r=='99'){if(g=='00'){if(b=='00'){return('DFRDark Faded Red');}
if(b=='33'){return('DPRDark Pink Red');}
if(b=='66'){return('DPMDark Pink Magenta');}
if(b=='99'){return('DFMDark Faded Magenta');}
if(b=='CC'){return('DMVDark Magenta Violet');}
if(b=='FF'){return('VVMViolet Violet Magenta');}
}if(g=='33'){if(b=='00'){return('DORDark Orange Red');}
if(b=='33'){return('DDRDark Dull Red');}
if(b=='66'){return('DDPDark Dull Pink');}
if(b=='99'){return('DDMDark Dull Magenta');}
if(b=='CC'){return('MVMMedium Violet Magenta');}
if(b=='FF'){return('LHVLight Hard Violet');}
}if(g=='66'){if(b=='00'){return('DOYDark Orange Yellow');}
if(b=='33'){return('DDODark Dull Orange');}
if(b=='66'){return('MWRMedium Weak Red');}
if(b=='99'){return('MWMMedium Weak Magenta');}
if(b=='CC'){return('LDVLight Dull Violet');}
if(b=='FF'){return('LVBLight Violet Blue');}
}if(g=='99'){if(b=='00'){return('DFYDark Faded Yellow');}
if(b=='33'){return('DDYDark Dull Yellow');}
if(b=='66'){return('MWYMedium Weak Yellow');}
if(b=='99'){return(' LGLight Gray');}
if(b=='CC'){return('LWBLight Weak Blue');}
if(b=='FF'){return('PDBPale Dull Blue');}
}if(g=='CC'){if(b=='00'){return('DYSDark Yellow Spring');}
if(b=='33'){return('MSYMedium Spring Yellow');}
if(b=='66'){return('LDSLight Dull Spring');}
if(b=='99'){return('LWGLight Weak Green');}
if(b=='CC'){return('LWCLight Weak Cyan');}
if(b=='FF'){return('PDAPale Dull Azure');}
}if(g=='FF'){if(b=='00'){return('SSYSpring Spring Yellow');}
if(b=='33'){return('LHSLight Hard Spring');}
if(b=='66'){return('LSGLight Spring Green');}
if(b=='99'){return('PDGPale Dull Green');}
if(b=='CC'){return('PDTPale Dull Teal');}
if(b=='FF'){return('PDCPale Dull Cyan');}
}}if(r=='CC'){if(g=='00'){if(b=='00'){return('DHRDark Hard Red');}
if(b=='33'){return('DRPDark Red Pink');}
if(b=='66'){return('DHPDark Hard Pink');}
if(b=='99'){return('DMPDark Magenta Pink');}
if(b=='CC'){return('DHMDark Hard Magenta');}
if(b=='FF'){return('MMVMagenta Magenta Violet');}
}if(g=='33'){if(b=='00'){return('DRODark Red Orange');}
if(b=='33'){return('MFRMedium Faded Red');}
if(b=='66'){return('MPRMedium Pink Red');}
if(b=='99'){return('MPMMedium Pink Magenta');}
if(b=='CC'){return('MFMMedium Faded Magenta');}
if(b=='FF'){return('LMVLight Magenta Violet');}
}if(g=='66'){if(b=='00'){return('DHODark Hard Orange');}
if(b=='33'){return('MORMedium Orange Red');}
if(b=='66'){return('LDRLight Dull Red');}
if(b=='99'){return('LDPLight Dull Pink');}
if(b=='CC'){return('LDMLight Dull Magenta');}
if(b=='FF'){return('LVMLight Violet Magenta');}
}if(g=='99'){if(b=='00'){return('DYODark Yellow Orange');}
if(b=='33'){return('MOYMedium Orange Yellow');}
if(b=='66'){return('LDOLight Dull Orange');}
if(b=='99'){return('LWRLight Weak Red');}
if(b=='CC'){return('LWMLight Weak Magenta');}
if(b=='FF'){return('PDVPale Dull Violet');}
}if(g=='CC'){if(b=='00'){return('DHYDark Hard Yellow');}
if(b=='33'){return('MFYMedium Faded Yellow');}
if(b=='66'){return('LDYLight Dull Yellow');}
if(b=='99'){return('LWYLight Weak Yellow');}
if(b=='CC'){return(' PGPale Gray');}
if(b=='FF'){return('PWBPale Weak Blue');}
}if(g=='FF'){if(b=='00'){return('YYSYellow Yellow Spring');}
if(b=='33'){return('LYSLight Yellow Spring');}
if(b=='66'){return('LSYLight Spring Yellow');}
if(b=='99'){return('PDSPale Dull Spring');}
if(b=='CC'){return('PWGPale Weak Green');}
if(b=='FF'){return('PWCPale Weak Cyan');}
}}if(r=='FF'){if(g=='00'){if(b=='00'){return(' R Red');}
if(b=='33'){return('RRPRed Red Pink');}
if(b=='66'){return('PPRPink Pink Red');}
if(b=='99'){return('PPMPink Pink Magenta');}
if(b=='CC'){return('MMPMagenta Magenta Pink');}
if(b=='FF'){return(' M Magenta');}
}if(g=='33'){if(b=='00'){return('RRORed Red Orange');}
if(b=='33'){return('LHRLight Hard Red');}
if(b=='66'){return('LRPLight Red Pink');}
if(b=='99'){return('LHPLight Hard Pink');}
if(b=='CC'){return('LMPLight Magenta Pink');}
if(b=='FF'){return('LHMLight Hard Magenta');}
}if(g=='66'){if(b=='00'){return('OOROrange Orange Red');}
if(b=='33'){return('LROLight Red Orange');}
if(b=='66'){return('LFRLight Faded Red');}
if(b=='99'){return('LPRLight Pink Red');}
if(b=='CC'){return('LPMLight Pink Magenta');}
if(b=='FF'){return('LFMLight Faded Magenta');}
}if(g=='99'){if(b=='00'){return('OOYOrange Orange Yellow');}
if(b=='33'){return('LHOLight Hard Orange');}
if(b=='66'){return('LORLight Orange Red');}
if(b=='99'){return('PDRPale Dull Red');}
if(b=='CC'){return('PDPPale Dull Pink');}
if(b=='FF'){return('PDMPale Dull Magenta');}
}if(g=='CC'){if(b=='00'){return('YYOYellow Yellow Orange');}
if(b=='33'){return('LYOLight Yellow Orange');}
if(b=='66'){return('LOYLight Orange Yellow');}
if(b=='99'){return('PDOPale Dull Orange');}
if(b=='CC'){return('PWRPale Weak Red');}
if(b=='FF'){return('PWMPale Weak Magenta');}
}if(g=='FF'){if(b=='00'){return(' Y Yellow');}
if(b=='33'){return('LHYLight Hard Yellow');}
if(b=='66'){return('LFYLight Faded Yellow');}
if(b=='99'){return('PDYPale Dull Yellow');}
if(b=='CC'){return('PWYPale Weak Yellow');}
if(b=='FF'){return(' W White');}
}}
alert(
    "function lookup_data() passed unexpected input:"
    + " r=" + r    +    " g=" + g    +    "b=" + b
    + ". This should not happen!"
);
return "??? Unknown Color";
}

function rrggbb_code_to_css_color_name( c ) {
var f = c.substring(4,5); // using the most even distribution for faster lookup
        if (f=='0') {
     if(c=='000000'){return 'black'}
else if(c=='006400'){return 'darkgreen'}
else if(c=='008000'){return 'green'}
else if(c=='00FF00'){return 'lime'}
else if(c=='7CFC00'){return 'lawngreen'}
else if(c=='7FFF00'){return 'chartreuse'}
else if(c=='800000'){return 'maroon'}
else if(c=='808000'){return 'olive'}
else if(c=='8B0000'){return 'darkred'}
else if(c=='B8860B'){return 'darkgoldenrod'}
else if(c=='FF0000'){return 'red'}
else if(c=='FF4500'){return 'orangered'}
else if(c=='FF8C00'){return 'darkorange'}
else if(c=='FFA500'){return 'orange'}
else if(c=='FFD700'){return 'gold'}
else if(c=='FFFF00'){return 'yellow'}
 } else if (f=='1') {
     if(c=='8B4513'){return 'saddlebrown'}
else if(c=='D2691E'){return 'chocolate'}
 } else if (f=='2') {
     if(c=='228B22'){return 'forestgreen'}
else if(c=='556B2F'){return 'darkolivegreen'}
else if(c=='6B8E23'){return 'olivedrab'}
else if(c=='A0522D'){return 'sienna'}
else if(c=='A52A2A'){return 'brown'}
else if(c=='ADFF2F'){return 'greenyellow'}
else if(c=='B22222'){return 'firebrick'}
else if(c=='DAA520'){return 'goldenrod'}
 } else if (f=='3') {
     if(c=='32CD32'){return 'limegreen'}
else if(c=='9ACD32'){return 'yellowgreen'}
else if(c=='CD853F'){return 'peru'}
else if(c=='DC143C'){return 'crimson'}
 } else if (f=='4') {
     if(c=='2F4F4F'){return 'darkslategray'}
else if(c=='FF6347'){return 'tomato'}
 } else if (f=='5') {
     if(c=='2E8B57'){return 'seagreen'}
else if(c=='CD5C5C'){return 'indianred'}
else if(c=='FF7F50'){return 'coral'}
 } else if (f=='6') {
     if(c=='696969'){return 'dimgray'}
else if(c=='BDB76B'){return 'darkkhaki'}
else if(c=='F4A460'){return 'sandybrown'}
 } else if (f=='7') {
     if(c=='00FF7F'){return 'springgreen'}
else if(c=='191970'){return 'midnightblue'}
else if(c=='3CB371'){return 'mediumseagreen'}
else if(c=='E9967A'){return 'darksalmon'}
else if(c=='FA8072'){return 'salmon'}
else if(c=='FFA07A'){return 'lightsalmon'}
 } else if (f=='8') {
     if(c=='000080'){return 'navy'}
else if(c=='00008B'){return 'darkblue'}
else if(c=='008080'){return 'teal'}
else if(c=='008B8B'){return 'darkcyan'}
else if(c=='483D8B'){return 'darkslateblue'}
else if(c=='4B0082'){return 'indigo'}
else if(c=='800080'){return 'purple'}
else if(c=='808080'){return 'gray'}
else if(c=='808080'){return 'grey'}
else if(c=='8B008B'){return 'darkmagenta'}
else if(c=='8FBC8F'){return 'darkseagreen'}
else if(c=='BC8F8F'){return 'rosybrown'}
else if(c=='C71585'){return 'mediumvioletred'}
else if(c=='D2B48C'){return 'tan'}
else if(c=='DEB887'){return 'burlywood'}
else if(c=='F08080'){return 'lightcoral'}
else if(c=='F0E68C'){return 'khaki'}
 } else if (f=='9') {
     if(c=='00FA9A'){return 'mediumspringgreen'}
else if(c=='708090'){return 'slategray'}
else if(c=='778899'){return 'lightslategray'}
else if(c=='90EE90'){return 'lightgreen'}
else if(c=='98FB98'){return 'palegreen'}
else if(c=='DB7093'){return 'palevioletred'}
else if(c=='FF1493'){return 'deeppink'}
 } else if (f=='A') {
     if(c=='20B2AA'){return 'lightseagreen'}
else if(c=='5F9EA0'){return 'cadetblue'}
else if(c=='66CDAA'){return 'mediumaquamarine'}
else if(c=='A9A9A9'){return 'darkgray'}
else if(c=='EEE8AA'){return 'palegoldenrod'}
else if(c=='FFDEAD'){return 'navajowhite'}
 } else if (f=='B') {
     if(c=='4682B4'){return 'steelblue'}
else if(c=='F5DEB3'){return 'wheat'}
else if(c=='FF69B4'){return 'hotpink'}
else if(c=='FFDAB9'){return 'peachpuff'}
else if(c=='FFE4B5'){return 'moccasin'}
 } else if (f=='C') {
     if(c=='0000CD'){return 'mediumblue'}
else if(c=='48D1CC'){return 'mediumturquoise'}
else if(c=='6A5ACD'){return 'slateblue'}
else if(c=='9932CC'){return 'darkorchid'}
else if(c=='C0C0C0'){return 'silver'}
else if(c=='FFB6C1'){return 'lightpink'}
else if(c=='FFC0CB'){return 'pink'}
else if(c=='FFE4C4'){return 'bisque'}
else if(c=='FFEBCD'){return 'blanchedalmond'}
else if(c=='FFFACD'){return 'lemonchiffon'}
 } else if (f=='D') {
     if(c=='00CED1'){return 'darkturquoise'}
else if(c=='40E0D0'){return 'turquoise'}
else if(c=='7FFFD4'){return 'aquamarine'}
else if(c=='9370DB'){return 'mediumpurple'}
else if(c=='9400D3'){return 'darkviolet'}
else if(c=='B0C4DE'){return 'lightsteelblue'}
else if(c=='BA55D3'){return 'mediumorchid'}
else if(c=='D3D3D3'){return 'lightgrey'}
else if(c=='D8BFD8'){return 'thistle'}
else if(c=='DA70D6'){return 'orchid'}
else if(c=='DCDCDC'){return 'gainsboro'}
else if(c=='DDA0DD'){return 'plum'}
else if(c=='F5F5DC'){return 'beige'}
else if(c=='FAEBD7'){return 'antiquewhite'}
else if(c=='FAFAD2'){return 'lightgoldenrodyellow'}
else if(c=='FFEFD5'){return 'papayawhip'}
else if(c=='FFF8DC'){return 'cornsilk'}
 } else if (f=='E') {
     if(c=='4169E1'){return 'royalblue'}
else if(c=='6495ED'){return 'cornflowerblue'}
else if(c=='7B68EE'){return 'mediumslateblue'}
else if(c=='87CEEB'){return 'skyblue'}
else if(c=='8A2BE2'){return 'blueviolet'}
else if(c=='ADD8E6'){return 'lightblue'}
else if(c=='AFEEEE'){return 'paleturquoise'}
else if(c=='B0E0E6'){return 'powderblue'}
else if(c=='EE82EE'){return 'violet'}
else if(c=='FAF0E6'){return 'linen'}
else if(c=='FDF5E6'){return 'oldlace'}
else if(c=='FFE4E1'){return 'mistyrose'}
else if(c=='FFF5EE'){return 'seashell'}
else if(c=='FFFFE0'){return 'lightyellow'}
 } else if (f=='F') {
     if(c=='0000FF'){return 'blue'}
else if(c=='00BFFF'){return 'deepskyblue'}
else if(c=='00FFFF'){return 'aqua'}
else if(c=='00FFFF'){return 'cyan'}
else if(c=='1E90FF'){return 'dodgerblue'}
else if(c=='87CEFA'){return 'lightskyblue'}
else if(c=='E0FFFF'){return 'lightcyan'}
else if(c=='E6E6FA'){return 'lavender'}
else if(c=='F0F8FF'){return 'aliceblue'}
else if(c=='F0FFF0'){return 'honeydew'}
else if(c=='F0FFFF'){return 'azure'}
else if(c=='F5F5F5'){return 'whitesmoke'}
else if(c=='F5FFFA'){return 'mintcream'}
else if(c=='F8F8FF'){return 'ghostwhite'}
else if(c=='FF00FF'){return 'fuchsia'}
else if(c=='FF00FF'){return 'fuscia'}
else if(c=='FF00FF'){return 'magenta'}
else if(c=='FFF0F5'){return 'lavenderblush'}
else if(c=='FFFAF0'){return 'floralwhite'}
else if(c=='FFFAFA'){return 'snow'}
else if(c=='FFFFF0'){return 'ivory'}
else if(c=='FFFFFF'){return 'white'}
}
return '';
}


