<script lang="ts">
    import {isIconData, type IconData} from '../icons/index.js';
    import Icon from './Icon.svelte';
    import Tooltip from './Tooltip.svelte';

    interface Props {
        /** The tooltip and the accessible name; the buttons are icon-only. */
        title: string;
        /** A single character, or icon data from `occulite-ui/icons`. */
        icon?: string | IconData;
        disabled?: boolean;
        /** Why the button is disabled - shown in the tooltip so "greyed out" is never a mystery. */
        reason?: string | undefined;
        pressed?: boolean | undefined;
        /**
         * The action this button started is still running: it turns, and it cannot be pressed
         * again. A refresh that reads a remote system takes a moment, and without a sign that
         * anything happened the button reads as one without a function.
         */
        busy?: boolean;
        onclick?: (() => void) | undefined;
        testId?: string | undefined;
    }

    let {
        title,
        icon = '•',
        disabled = false,
        reason = undefined,
        pressed = undefined,
        busy = false,
        onclick = undefined,
        testId = undefined,
    }: Props = $props();

    /** The anchor a test hovers: the button itself is disabled half the time and takes no pointer. */
    const tooltipTestId = $derived(testId === undefined ? undefined : `${testId}-tooltip`);
</script>

<!--
    The tooltip is drawn by the app, not by the browser. The `title` attribute made the
    wait the browser's - four to five seconds on the reporter's macOS, a few hundred milliseconds
    elsewhere - and on a disabled button it never appeared at all, which is precisely where the
    text matters: `reason` is why the button is greyed out.
-->
<Tooltip text={disabled && reason !== undefined ? `${title} — ${reason}` : title} testId={tooltipTestId}>
    <button
        type="button"
        class="hmm-toolbar-button"
        class:hmm-toolbar-button-pressed={pressed === true}
        aria-label={title}
        aria-pressed={pressed}
        aria-busy={busy ? 'true' : undefined}
        data-testid={testId}
        disabled={disabled || busy}
        onclick={() => onclick?.()}
    >
        <span class="hmm-toolbar-icon" class:hmm-toolbar-icon-busy={busy} aria-hidden="true"
            >{#if isIconData(icon)}<Icon {icon} />{:else}{icon}{/if}</span
        >
    </button>
</Tooltip>

<style>
    /* The icon buttons of the she UI: no frame until the pointer is on them. */
    .hmm-toolbar-button {
        width: 26px;
        height: 26px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: var(--hmm-radius);
        background: none;
        color: var(--hmm-fg-muted);
        cursor: pointer;
        line-height: 1;
    }

    .hmm-toolbar-button:hover:not(:disabled) {
        background: var(--hmm-control-bg-hover);
        color: var(--hmm-fg);
    }

    /*
     * A disabled control dispatches no pointer events at all, so the anchor around it
     * would never see the pointer and the tooltip that says *why* it is disabled could never
     * appear. Taking it out of the hit test hands the pointer to the anchor.
     */
    .hmm-toolbar-button:disabled {
        opacity: 0.4;
        cursor: default;
        pointer-events: none;
    }

    /* While the action runs the icon turns, so a refresh that takes a second is
       visibly a refresh. `prefers-reduced-motion` gets the dimmed button without the spin. */
    .hmm-toolbar-icon {
        display: inline-block;
        line-height: 1;
    }

    .hmm-toolbar-icon-busy {
        animation: hmm-toolbar-spin 1s linear infinite;
    }

    @keyframes hmm-toolbar-spin {
        from {
            transform: rotate(0deg);
        }

        to {
            transform: rotate(360deg);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .hmm-toolbar-icon-busy {
            animation: none;
        }
    }

    .hmm-toolbar-button-pressed {
        background: var(--hmm-accent-bg);
        border-color: var(--hmm-accent);
        color: var(--hmm-fg);
    }
</style>
