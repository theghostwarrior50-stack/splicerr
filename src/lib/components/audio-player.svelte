<script lang="ts">
    import { cn } from "$lib/utils"
    import Button from "$lib/components/ui/button/button.svelte"
    import Play from "lucide-svelte/icons/play"
    import Pause from "lucide-svelte/icons/pause"
    import SkipForward from "lucide-svelte/icons/skip-forward"
    import SkipBack from "lucide-svelte/icons/skip-back"
    import { globalAudio } from "$lib/shared/audio.svelte"
    import type { MouseEventHandler } from "svelte/elements"
    import LoaderCircle from "lucide-svelte/icons/loader-circle"
    import { loading } from "$lib/shared/loading.svelte"
    import PackPreview from "$lib/components/pack-preview.svelte"
    import * as Tooltip from "$lib/components/ui/tooltip"
    import { dataStore, fetchAssets } from "$lib/shared/store.svelte"
    import TagBadge from "$lib/components/tag-badge.svelte"
    import { assetIcons } from "$lib/shared/icons.svelte"
    import VolumeX from "lucide-svelte/icons/volume-x"
    import Volume1 from "lucide-svelte/icons/volume-1"
    import Volume2 from "lucide-svelte/icons/volume-2"

    let {
        class: className,
        onnext,
        onprev,
        ...restProps
    }: {
        class?: string
        onnext: MouseEventHandler<HTMLButtonElement> & MouseEventHandler<HTMLAnchorElement>
        onprev: MouseEventHandler<HTMLButtonElement> & MouseEventHandler<HTMLAnchorElement>
    } = $props()

    const currentPack = $derived(globalAudio.currentAsset?.parents.items[0])
    const currentName = $derived(globalAudio.currentAsset?.name.split("/").slice(-1)[0])

    const formatTime = (s: number) => {
        if (!s || isNaN(s)) return "0:00"
        const m = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${m}:${sec < 10 ? "0" : ""}${sec}`
    }
</script>

<div class={cn("flex flex-col w-full border-t border-border bg-background", className)} {...restProps}>
    <audio
        bind:this={globalAudio.ref}
        bind:paused={globalAudio.paused}
        bind:currentTime={globalAudio.currentTime}
        bind:duration={globalAudio.duration}
        bind:volume={globalAudio.volume}
        onloadstart={() => { globalAudio.loading = true }}
        oncanplaythrough={() => { globalAudio.loading = false }}
    ></audio>

    <!-- Slim progress bar -->
    <div class="relative w-full h-0.5 bg-border group cursor-pointer">
        <div
            class="absolute inset-y-0 left-0 bg-primary/60 group-hover:bg-primary transition-colors duration-150"
            style="width: {globalAudio.progress() * 100 || 0}%"
        ></div>
        <input
            style="--progress: {globalAudio.progress() * 100 || 0}%"
            type="range"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            min={0}
            max={globalAudio.duration || 0}
            step="any"
            bind:value={globalAudio.currentTime}
            onclick={() => globalAudio.ref.play()}
        />
    </div>

    <!-- Player controls row -->
    <div class="flex items-center px-3 py-1.5 gap-3">
        <!-- Transport -->
        <div class="flex items-center gap-0.5">
            <Button
                variant="ghost"
                size="icon"
                class="size-8 text-muted-foreground hover:text-foreground"
                onclick={onprev}
                disabled={!globalAudio.currentAsset}
            >
                <SkipBack size="15" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                class="size-9 text-foreground"
                onclick={() => globalAudio.togglePlay()}
                disabled={!globalAudio.currentAsset}
            >
                {#if globalAudio.loading || loading.samplesCount}
                    <LoaderCircle size="16" class="animate-spin" />
                {:else if globalAudio.paused}
                    <Play size="16" />
                {:else}
                    <Pause size="16" />
                {/if}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                class="size-8 text-muted-foreground hover:text-foreground"
                onclick={onnext}
                disabled={!globalAudio.currentAsset}
            >
                <SkipForward size="15" />
            </Button>
        </div>

        <!-- Time -->
        <span class="text-[11px] text-muted-foreground tabular-nums shrink-0">
            {formatTime(globalAudio.currentTime)} / {formatTime(globalAudio.duration)}
        </span>

        <!-- Track info -->
        {#if globalAudio.currentAsset}
            <div class="flex gap-2.5 items-center shrink min-w-0 flex-1">
                <PackPreview side="top" pack={currentPack} size={8} />
                {#if globalAudio.currentAsset.asset_category_slug in assetIcons}
                    {@const Icon = assetIcons[globalAudio.currentAsset.asset_category_slug]}
                    <Icon size="13" class="text-muted-foreground shrink-0" />
                {/if}
                <div class="min-w-0 overflow-clip">
                    <div class="relative pr-6 after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-r after:from-transparent after:to-background after:pointer-events-none">
                        <Tooltip.Provider>
                            <Tooltip.Root>
                                <Tooltip.Trigger class="overflow-clip text-nowrap text-sm leading-snug cursor-default block">
                                    {currentName}
                                </Tooltip.Trigger>
                                <Tooltip.Content>{currentName}</Tooltip.Content>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                        <div class="flex gap-0.5 overflow-clip text-nowrap mt-0.5">
                            {#each globalAudio.currentAsset.tags as tag}
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
            </div>
        {:else}
            <div class="flex-1"></div>
        {/if}

        <!-- Volume -->
        <div class="flex items-center gap-1.5 shrink-0">
            <Button
                variant="ghost"
                size="icon"
                class="size-7 text-muted-foreground hover:text-foreground"
                onclick={() => globalAudio.toggleMute()}
            >
                {#if globalAudio.volume == 0}
                    <VolumeX size="14" />
                {:else if globalAudio.volume < 0.5}
                    <Volume1 size="14" />
                {:else}
                    <Volume2 size="14" />
                {/if}
            </Button>
            <div class="relative w-20 h-1 bg-border rounded-full cursor-pointer group">
                <div
                    class="absolute inset-y-0 left-0 bg-muted-foreground group-hover:bg-primary rounded-full transition-colors duration-150"
                    style="width: {globalAudio.volume * 100}%"
                ></div>
                <input
                    type="range"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    min={0}
                    max={1}
                    step="any"
                    bind:value={globalAudio.volume}
                />
            </div>
        </div>
    </div>
</div>
