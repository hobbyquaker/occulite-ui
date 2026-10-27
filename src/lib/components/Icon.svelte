<script lang="ts">
    import type {IconData} from '../icons/index.js';

    interface Props {
        icon: IconData;
        /** Width and height in pixels. */
        size?: number;
        /** The accessible name; absent, the icon is decoration and hidden from assistive technology. */
        label?: string | undefined;
        testId?: string | undefined;
    }

    let {icon, size = 16, label = undefined, testId = undefined}: Props = $props();

    const stroked = $derived(icon.mode === 'stroke');
</script>

<svg
    class="hmm-icon"
    width={size}
    height={size}
    viewBox={icon.viewBox ?? '0 0 24 24'}
    role={label === undefined ? undefined : 'img'}
    aria-label={label}
    aria-hidden={label === undefined ? 'true' : undefined}
    focusable="false"
    data-testid={testId}
>
    {#each icon.paths as d, index (index)}
        {#if stroked}
            <path
                {d}
                fill="none"
                stroke="currentColor"
                stroke-width={icon.strokeWidth ?? 2}
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        {:else}
            <path {d} fill="currentColor" />
        {/if}
    {/each}
</svg>

<style>
    .hmm-icon {
        display: inline-block;
        flex: none;
        vertical-align: middle;
    }
</style>
