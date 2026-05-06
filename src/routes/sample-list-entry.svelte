<script lang="ts">
    import { globalAudio } from "$lib/shared/audio.svelte"
    import PackPreview from "$lib/components/pack-preview.svelte"
    import TagBadge from "$lib/components/tag-badge.svelte"
    import Waveform from "$lib/components/waveform.svelte"
    import type { SampleAsset } from "$lib/splice/types"
    import Pause from "lucide-svelte/icons/pause"
    import Play from "lucide-svelte/icons/play"
    import Button from "$lib/components/ui/button/button.svelte"
    import * as Tooltip from "$lib/components/ui/tooltip/index.js"
    import LoaderCircle from "lucide-svelte/icons/loader-circle"
    import { dataStore, fetchAssets } from "$lib/shared/store.svelte"
    import { cn, formatKey } from "$lib/utils"
    import { loading } from "$lib/shared/loading.svelte"
    import { assetIcons } from "$lib/shared/icons.svelte"
    import { handleSampleDrag } from "$lib/shared/drag.svelte"

    let {
        class: className,
        selected,
        playing,
        sampleAsset,
    }: {
        class?: string
        selected: boolean
        playing: boolean
        sampleAsset: SampleAsset
    } = $props()

    let playButtonRef = $state<HTMLButtonElement>(null!)

    $effect(() => {
        if (selected) playButtonRef.focus({ preventScroll: true })
    })

    const pack = $derived(sampleAsset.parents.items[0])
    const name = $derived(sampleAsset.name.split("/").slice(-1)[0])

    const millisToTime = (ms: number) => {
        const m = Math.floor(ms / 60000)
        const s = Math.floor((ms % 60000) / 1000)
        return `${m}:${s < 10 ? "0" : ""}${s}`
    }
</script>

<button
    class={cn(
        "group flex gap-2 items-center justify-between px-1 py-1 rounded-md focus:outline-none cursor-grab transition-colors duration-100",
        selected
            ? "bg-accent text-foreground"
            : "hover:bg-accent/60 text-foreground",
        className
    )}
    id={`sample-list-entry-${sampleAsset.uuid}`}
    draggable="true"
    tabindex="-1"
    onmousedown={() => globalAudio.selectSampleAsset(sampleAsset, false)}
    ondragstart={(e) => handleSampleDrag(e, sampleAsset)}
>
    <!-- Pack art -->
    <PackPreview {pack} size={8} />

    <!-- Play/pause button -->
    <Button
        variant="ghost"
        bind:ref={playButtonRef}
        class={cn(
            "group/btn flex-shrink-0 focus:outline-none size-8 p-0 rounded-md",
            selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
        size="icon"
        onclick={() =>
            playing
                ? globalAudio.ref.pause()
                : globalAudio.playSampleAsset(sampleAsset)}
    >
        {#if (selected && globalAudio.loading) || (loading.samplesCount && loading.samples.has(sampleAsset.uuid))}
            <LoaderCircle size="15" class="animate-spin" />
        {:else if playing}
            <Pause size="15" />
        {:else}
            <Play size="15" class="group-hover/btn:block hidden" />
            {#if sampleAsset.asset_category_slug in assetIcons}
                {@const Icon = assetIcons[sampleAsset.asset_category_slug]}
                <Icon size="15" class="group-hover/btn:hidden" />
            {:else}
                <Play size="15" class="group-hover/btn:hidden opacity-30" />
            {/if}
        {/if}
    </Button>

    <!-- Filename + tags -->
    <div class="min-w-32 w-96 flex-[3_1_auto] overflow-clip">
        <div
            class={cn(
                "text-left relative after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-r after:from-transparent after:pointer-events-none",
                selected ? "after:to-accent" : "after:to-background group-hover:after:to-accent/60"
            )}
        >
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger class="overflow-clip text-nowrap text-sm leading-snug cursor-grab block">
                        {name}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{name}</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
            <div class="flex gap-0.5 overflow-clip text-nowrap mt-0.5">
                {#each sampleAsset.tags as tag}
                    {@const active = dataStore.tags.includes(tag.uuid)}
                    {@const summary = dataStore.tag_summary.find((t: any) => t.tag.uuid == tag.uuid)}
                    <TagBadge
                        label={tag.label}
                        variant="ghost"
                        class="px-1 py-0 h-auto text-[10px]"
                        count={summary?.count ?? 0}
                        onclick={() => {
                            if (!active) {
                                dataStore.tags.push(tag.uuid)
                                fetchAssets()
                            }
                        }}
                    />
                {/each}
            </div>
        </div>
    </div>

    <!-- Waveform -->
    <Waveform
        src={sampleAsset.files[1].url}
        progress={selected ? globalAudio.progress() : 0}
        onseek={(p) => globalAudio.playSampleAsset(sampleAsset, p * (sampleAsset.duration / 1000))}
        class="min-w-32 w-[150px] h-9 flex-grow md:block hidden opacity-70 group-hover:opacity-100 transition-opacity duration-150"
    />

    <!-- Duration -->
    <div class="text-muted-foreground text-xs tabular-nums flex-shrink-0 w-14 text-right">
        {millisToTime(sampleAsset.duration)}
    </div>

    <!-- Key -->
    <div class="text-muted-foreground text-xs tabular-nums flex-shrink-0 w-14 text-right">
        {(sampleAsset.key && formatKey(sampleAsset.key, sampleAsset.chord_type)) ?? "—"}
    </div>

    <!-- BPM -->
    <div class="text-muted-foreground text-xs tabular-nums flex-shrink-0 w-14 text-right">
        {sampleAsset.bpm ?? "—"}
    </div>
</button>
