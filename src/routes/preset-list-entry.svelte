<script lang="ts">
    import type { PresetAsset } from "$lib/splice/types"
    import PackPreview from "$lib/components/pack-preview.svelte"
    import TagBadge from "$lib/components/tag-badge.svelte"
    import Button from "$lib/components/ui/button/button.svelte"
    import * as Tooltip from "$lib/components/ui/tooltip/index.js"
    import { cn } from "$lib/utils"
    import { presetStore, fetchPresets } from "$lib/shared/store.svelte"
    import { savePreset } from "$lib/shared/files.svelte"
    import { isSamplesDirValid } from "$lib/shared/config.svelte"
    import Settings2 from "lucide-svelte/icons/settings-2"
    import Download from "lucide-svelte/icons/download"
    import CheckCheck from "lucide-svelte/icons/check-check"
    import LoaderCircle from "lucide-svelte/icons/loader-circle"
    import TriangleAlert from "lucide-svelte/icons/triangle-alert"

    let {
        class: className,
        presetAsset,
    }: {
        class?: string
        presetAsset: PresetAsset
    } = $props()

    const pack = $derived(presetAsset.parents?.items[0])
    const name = $derived(presetAsset.name.split("/").slice(-1)[0])
    const deviceNames = $derived(
        presetAsset.asset_devices?.map((d) => d.device.name).join(", ") ?? "—"
    )

    let downloadState = $state<"idle" | "loading" | "done" | "error">("idle")
    let downloadError = $state<string | null>(null)

    const handleDownload = async () => {
        if (!isSamplesDirValid()) {
            downloadError = "Set a valid Samples Directory in Settings first."
            downloadState = "error"
            setTimeout(() => { downloadState = "idle"; downloadError = null }, 3000)
            return
        }
        downloadState = "loading"
        try {
            await savePreset(presetAsset)
            downloadState = "done"
            setTimeout(() => { downloadState = "idle" }, 2500)
        } catch (e: any) {
            console.error("⚠️ Preset download failed", e)
            downloadError = e?.message ?? "Download failed"
            downloadState = "error"
            setTimeout(() => { downloadState = "idle"; downloadError = null }, 3000)
        }
    }
</script>

<div
    class={cn(
        "group flex gap-2 items-center justify-between px-1 py-1 rounded-md transition-colors duration-100 hover:bg-accent/60",
        className
    )}
    id={`preset-list-entry-${presetAsset.uuid}`}
>
    <!-- Pack art -->
    <PackPreview {pack} size={8} />

    <!-- Preset icon -->
    <div class="flex-shrink-0 size-8 flex items-center justify-center text-muted-foreground">
        <Settings2 size="15" />
    </div>

    <!-- Name + tags -->
    <div class="min-w-32 w-96 flex-[3_1_auto] overflow-clip">
        <div class="text-left relative after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-r after:from-transparent after:to-background after:pointer-events-none group-hover:after:to-accent/60">
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger class="overflow-clip text-nowrap text-sm leading-snug block">
                        {name}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{name}</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
            <div class="flex gap-0.5 overflow-clip text-nowrap mt-0.5">
                {#each presetAsset.tags as tag}
                    {@const active = presetStore.tags.includes(tag.uuid)}
                    <TagBadge
                        label={tag.label}
                        variant="ghost"
                        class="px-1 py-0 h-auto text-[10px]"
                        count={0}
                        onclick={() => {
                            if (!active) {
                                presetStore.tags.push(tag.uuid)
                                fetchPresets()
                            }
                        }}
                    />
                {/each}
            </div>
        </div>
    </div>

    <!-- Device / plugin name -->
    <div class="min-w-32 w-[200px] flex-grow md:block hidden text-xs text-muted-foreground truncate">
        {deviceNames}
    </div>

    <!-- Download button -->
    <div class="flex-shrink-0 w-20 flex justify-end pr-1">
        {#if downloadState === "error"}
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="icon" class="size-8 text-warn" disabled>
                            <TriangleAlert size="14" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{downloadError}</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        {:else}
            <Button
                variant="ghost"
                size="icon"
                class={cn(
                    "size-8 transition-all duration-150",
                    downloadState === "idle" && "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground",
                    downloadState === "loading" && "opacity-100 text-muted-foreground",
                    downloadState === "done" && "opacity-100 text-green-500"
                )}
                disabled={downloadState === "loading" || downloadState === "done"}
                onclick={handleDownload}
            >
                {#if downloadState === "loading"}
                    <LoaderCircle size="14" class="animate-spin" />
                {:else if downloadState === "done"}
                    <CheckCheck size="14" />
                {:else}
                    <Download size="14" />
                {/if}
            </Button>
        {/if}
    </div>
</div>
