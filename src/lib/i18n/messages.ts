import type {Catalogue} from './translator.js';

/**
 * The kit's own strings: the chrome of its components (close, filter, the table's column menu,
 * the toast stack, the theme and language switches) and the handful of words every dialog needs.
 *
 * An app adds its own catalogue with `addMessages()`; on a collision the app wins, per language.
 * Every key has a German and an English text (`i18n.test.ts` checks it).
 */
export const KIT_MESSAGES: Catalogue = {
    // dialogs and buttons
    Close: {de: 'Schließen', en: 'Close'},
    Apply: {de: 'Übernehmen', en: 'Apply'},
    Cancel: {de: 'Abbrechen', en: 'Cancel'},
    OK: {de: 'OK', en: 'OK'},
    Save: {de: 'Speichern', en: 'Save'},
    Delete: {de: 'Löschen', en: 'Delete'},
    Copy: {de: 'Kopieren', en: 'Copy'},
    Error: {de: 'Fehler', en: 'Error'},
    Loading: {de: 'Wird geladen', en: 'Loading'},
    Menu: {de: 'Menü', en: 'Menu'},
    Tabs: {de: 'Reiter', en: 'Tabs'},
    Toolbar: {de: 'Werkzeugleiste', en: 'Toolbar'},

    // filters and selections
    Filter: {de: 'Filter', en: 'Filter'},
    'Filter all columns': {de: 'Alle Spalten filtern', en: 'Filter all columns'},
    'Clear filter': {de: 'Filter löschen', en: 'Clear filter'},
    'No row matches the filter': {de: 'Keine Zeile passt zum Filter', en: 'No row matches the filter'},
    'Check all': {de: 'Alle auswählen', en: 'Check all'},
    'Uncheck all': {de: 'Auswahl entfernen', en: 'Uncheck all'},

    // the table's column handles, its header menu and the copy button of a cell
    'Resize column {column}': {de: 'Breite der Spalte {column} ändern', en: 'Resize column {column}'},
    'Fit column to content': {de: 'Spaltenbreite an den Inhalt anpassen', en: 'Fit column to content'},
    'Reset column widths': {de: 'Spaltenbreiten zurücksetzen', en: 'Reset column widths'},
    'Column widths': {de: 'Spaltenbreiten', en: 'Column widths'},
    'Expand row': {de: 'Zeile aufklappen', en: 'Expand row'},
    'Collapse row': {de: 'Zeile zuklappen', en: 'Collapse row'},
    'Copy name': {de: 'Namen kopieren', en: 'Copy name'},
    'Copy address': {de: 'Adresse kopieren', en: 'Copy address'},
    Copied: {de: 'Kopiert', en: 'Copied'},
    'Could not copy - the text is selected': {
        de: 'Kopieren nicht möglich - der Text ist markiert',
        en: 'Could not copy - the text is selected',
    },

    // the toast stack
    Dismiss: {de: 'Ausblenden', en: 'Dismiss'},
    '{count} more': {
        de: {one: '{count} weitere', other: '{count} weitere'},
        en: {one: '{count} more', other: '{count} more'},
    },
    'Show fewer': {de: 'Weniger anzeigen', en: 'Show fewer'},

    // theme and language
    Theme: {de: 'Design', en: 'Theme'},
    'Theme: light': {de: 'Design: hell', en: 'Theme: light'},
    'Theme: dark': {de: 'Design: dunkel', en: 'Theme: dark'},
    'Theme: system': {de: 'Design: System', en: 'Theme: system'},
    Language: {de: 'Sprache', en: 'Language'},
    'Browser language': {de: 'Sprache des Browsers', en: 'Browser language'},
};
