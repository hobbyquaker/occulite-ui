import {fireEvent, render, screen} from '@testing-library/svelte';
import {flushSync} from 'svelte';
import {afterEach, describe, expect, it} from 'vitest';

import {addMessages, i18n, resetMessages} from '../i18n/i18n.svelte.js';
import type {Notice} from '../notices/NoticesStore.svelte.js';
import Dialog from './Dialog.svelte';
import LanguageSwitch from './LanguageSwitch.svelte';
import Loader from './Loader.svelte';
import MultiSelect from './MultiSelect.svelte';
import Notices from './Notices.svelte';
import Tabs from './Tabs.svelte';
import ThemeSwitch from './ThemeSwitch.svelte';
import Toolbar from './Toolbar.svelte';

/**
 * A component's own words come from the kit's catalogue when the caller passes none, and they
 * follow the page's language reactively: a switch re-renders them without a remount.
 */
afterEach(() => {
    i18n.language = 'en';
    resetMessages();
});

const notices: Notice[] = Array.from({length: 7}, (_, index) => ({
    id: index + 1,
    level: 'error' as const,
    message: `error ${String(index + 1)}`,
    timestamp: 0,
}));

describe("the kit's own words in its components", () => {
    it('speak English by default and German when the page switches, without a remount', () => {
        render(ThemeSwitch, {props: {theme: 'dark'}});
        render(LanguageSwitch, {});
        render(Tabs, {props: {tabs: [{id: 'a', label: 'A'}]}});
        render(Toolbar, {});
        render(Loader, {props: {visible: true}});
        expect(screen.getByRole('button', {name: 'Theme: dark'})).toBeTruthy();
        expect(screen.getByLabelText('Language')).toBeTruthy();
        expect(screen.getByRole('tablist', {name: 'Tabs'})).toBeTruthy();
        expect(screen.getByRole('toolbar', {name: 'Toolbar'})).toBeTruthy();
        expect(screen.getByRole('status').textContent).toContain('Loading…');

        i18n.language = 'de';
        flushSync();
        expect(screen.getByRole('button', {name: 'Design: dunkel'})).toBeTruthy();
        expect(screen.getByLabelText('Sprache')).toBeTruthy();
        expect(screen.getByRole('tablist', {name: 'Reiter'})).toBeTruthy();
        expect(screen.getByRole('toolbar', {name: 'Werkzeugleiste'})).toBeTruthy();
        expect(screen.getByRole('status').textContent).toContain('Wird geladen…');
    });

    it('counts the hidden toasts in the page language', () => {
        render(Notices, {props: {notices}});
        expect(screen.getByRole('button', {name: '2 more'})).toBeTruthy();
        i18n.language = 'de';
        flushSync();
        expect(screen.getByRole('button', {name: '2 weitere'})).toBeTruthy();
        expect(screen.getAllByRole('button', {name: 'Ausblenden'}).length).toBeGreaterThan(0);
    });

    it('labels the dialog close button and the multi-select links', async () => {
        i18n.language = 'de';
        render(Dialog, {props: {open: true, title: 'T'}});
        expect(await screen.findByRole('button', {name: 'Schließen'})).toBeTruthy();

        render(MultiSelect, {props: {options: [{value: 'a', label: 'A'}], selected: [], placeholder: 'Pick'}});
        await fireEvent.click(screen.getByRole('button', {name: /Pick/}));
        expect(screen.getByLabelText('Filter')).toBeTruthy();
        expect(screen.getByText('Alle auswählen')).toBeTruthy();
        expect(screen.getByText('Auswahl entfernen')).toBeTruthy();
    });

    it("lets the caller's label win, and an app catalogue over the kit's", () => {
        render(ThemeSwitch, {props: {theme: 'light', labelFor: () => 'Look'}});
        expect(screen.getByRole('button', {name: 'Look'})).toBeTruthy();

        addMessages({'Theme: dark': {en: 'Dark look'}});
        render(ThemeSwitch, {props: {theme: 'dark'}});
        expect(screen.getByRole('button', {name: 'Dark look'})).toBeTruthy();
    });
});
