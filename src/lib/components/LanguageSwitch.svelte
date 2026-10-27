<script lang="ts">
    import {LANGUAGE_LABELS, t as kitT, UI_LANGUAGES} from '../i18n/i18n.svelte.js';
    import type {LanguageChoice} from '../i18n/translator.js';

    interface Props {
        /** The stored choice, not the resolved language: `auto` is one of the entries. */
        language?: LanguageChoice;
        label?: string | undefined;
        /** The first entry - "Browser language", or whatever the caller's catalogue calls it. */
        autoLabel?: string | undefined;
        onchange?: ((language: LanguageChoice) => void) | undefined;
        testId?: string | undefined;
    }

    let {
        language = $bindable('auto'),
        label: labelProp = undefined,
        autoLabel: autoLabelProp = undefined,
        onchange = undefined,
        testId = undefined,
    }: Props = $props();

    const label = $derived(labelProp ?? kitT('Language'));
    const autoLabel = $derived(autoLabelProp ?? kitT('Browser language'));
</script>

<!--
    This used to sit in the header, next to the theme switch, where it was one of
    the two controls a user touches once and never again. It lives in the settings dialog now, and
    the entry above the languages is the default - the browser's own order, with English behind it -
    so "I never chose" and "I chose German" stay two different answers.
-->
<select
    class="hmm-select hmm-language"
    aria-label={label}
    title={label}
    data-testid={testId}
    value={language}
    onchange={(event) => {
        language = event.currentTarget.value as LanguageChoice;
        onchange?.(language);
    }}
>
    <option value="auto">{autoLabel}</option>
    {#each UI_LANGUAGES as candidate (candidate)}
        <option value={candidate}>{LANGUAGE_LABELS[candidate]}</option>
    {/each}
</select>

<style>
    /*
        No width of its own any more: in the settings dialog it is one of the rows, and every other
        control there fills the row's `minmax(0, 1fr)` track.
    */
    .hmm-language {
        min-width: 0;
    }
</style>
