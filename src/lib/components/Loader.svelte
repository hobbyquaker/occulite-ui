<script lang="ts">
    import {t as kitT} from '../i18n/i18n.svelte.js';
    interface Props {
        /** Covers its positioned parent while true - the 2.x `#loader` over the whole window. */
        visible?: boolean;
        text?: string | undefined;
        testId?: string | undefined;
    }

    let {visible = false, text: textProp = undefined, testId = undefined}: Props = $props();

    const text = $derived(textProp ?? `${kitT('Loading')}…`);
</script>

{#if visible}
    <div class="hmm-loader" role="status" aria-live="polite" data-testid={testId}>
        <div class="hmm-loader-box">
            <div class="hmm-loader-spinner" aria-hidden="true"></div>
            <div class="hmm-loader-text">{text}</div>
        </div>
    </div>
{/if}

<style>
    .hmm-loader {
        position: absolute;
        inset: 0;
        z-index: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--hmm-overlay);
    }

    .hmm-loader-box {
        text-align: center;
    }

    .hmm-loader-spinner {
        width: 28px;
        height: 28px;
        margin: 0 auto 10px;
        border: 3px solid var(--hmm-border);
        border-top-color: var(--hmm-accent);
        border-radius: 50%;
        animation: hmm-spin 900ms linear infinite;
    }

    .hmm-loader-text {
        font-size: 14px;
        color: var(--hmm-fg-muted);
    }

    @keyframes hmm-spin {
        to {
            transform: rotate(360deg);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .hmm-loader-spinner {
            animation-duration: 3s;
        }
    }
</style>
