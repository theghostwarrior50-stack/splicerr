<script lang="ts">
    import SampleListEntry from "./sample-list-entry.svelte"
    import PresetListEntry from "./preset-list-entry.svelte"
    import SearchInput from "$lib/components/search-input.svelte"
    import { ScrollArea } from "$lib/components/ui/scroll-area"
    import { onMount, tick } from "svelte"
    import SortSelect from "$lib/components/sort-select.svelte"
    import Search from "lucide-svelte/icons/search"
    import Smile from "lucide-svelte/icons/smile"
    import Ghost from "lucide-svelte/icons/ghost"
    import Shuffle from "lucide-svelte/icons/shuffle"
    import Sliders from "lucide-svelte/icons/sliders-horizontal"
    import AudioLines from "lucide-svelte/icons/audio-lines"
    import Settings2 from "lucide-svelte/icons/settings-2"
    import Button from "$lib/components/ui/button/button.svelte"
    import ProgressLoading from "$lib/components/progress-loading.svelte"
    import SortHeader from "$lib/components/sort-header.svelte"
    import ChevronDown from "lucide-svelte/icons/chevron-down"
    import { cn } from "$lib/utils"
    import AssetCategorySelect from "$lib/components/asset-category-select.svelte"
    import BpmSelect from "$lib/components/bpm-select.svelte"
    import AudioPlayer from "$lib/components/audio-player.svelte"
    import TagBadge from "$lib/components/tag-badge.svelte"
    import { globalAudio } from "$lib/shared/audio.svelte"
    import type { AssetSortType } from "$lib/splice/types"
    import { loading } from "$lib/shared/loading.svelte"
    import {
        dataStore,
        presetStore,
        storeCallbacks,
        queryStore,
        presetQueryStore,
        fetchAssets,
        fetchPresets,
        DEFAULT_SORT,
        randomSeed,
    } from "$lib/shared/store.svelte"
    import SettingsDialog from "$lib/components/settings-dialog.svelte"
    import KeySelect from "$lib/components/key-select.svelte"

    // Tab state: "sounds" | "presets"
    let activeTab = $state<"sounds" | "presets">("sounds")

    $effect(() => {
        if (queryStore.sort in ["random", "popularity", "relevance", "recency"]) {
            queryStore.order = "DESC"
        }
    })

    storeCallbacks.onbeforedataupdate = () => {
        viewportRef?.scrollTo({ top: 0, behavior: "smooth" })
    }

    storeCallbacks.onbeforetagsupdate = () => {
        if (tagsDrawerRef && tagsContainerRef)
            tagsDrawerRef.style.height = `${tagsContainerRef.offsetHeight}px`
    }

    let expandTags = $state(false)

    let viewportRef = $state<HTMLElement>(null!)
    let presetsViewportRef = $state<HTMLElement>(null!)
    let tagsContainerRef = $state<HTMLElement>(null!)
    let tagsDrawerRef = $state<HTMLElement>(null!)
    let searchInputRef = $state<HTMLInputElement>(null!)

    const selectedSampleIndex = $derived(
        dataStore.sampleAssets.findIndex(
            (s) => s.uuid == globalAudio.currentAsset?.uuid
        )
    )

    const updateSort = (newSort: AssetSortType) => {
        if (queryStore.sort == newSort) {
            if (queryStore.order == "DESC") queryStore.order = "ASC"
            else queryStore.sort = DEFAULT_SORT
        } else {
            queryStore.sort = newSort
            queryStore.order = "DESC"
        }
        fetchAssets()
    }

    const gotoPrev = () => {
        const idx = dataStore.sampleAssets.findIndex(
            (a) => a.uuid === globalAudio.currentAsset?.uuid
        )
        if (idx > 0) {
            const asset = dataStore.sampleAssets[idx - 1]
            globalAudio.playSampleAsset(asset)
            document
                .getElementById(`sample-list-entry-${asset.uuid}`)
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
    }

    const gotoNext = () => {
        const idx = dataStore.sampleAssets.findIndex(
            (a) => a.uuid === globalAudio.currentAsset?.uuid
        )
        if (idx !== -1 && idx + 1 < dataStore.sampleAssets.length) {
            const asset = dataStore.sampleAssets[idx + 1]
            globalAudio.playSampleAsset(asset)
            document
                .getElementById(`sample-list-entry-${asset.uuid}`)
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
    }

    const switchTab = (tab: "sounds" | "presets") => {
        activeTab = tab
        if (tab === "presets" && presetStore.presetAssets.length === 0) {
            presetQueryStore.query = queryStore.query
            fetchPresets()
        }
    }

    onMount(() => {
        // Sounds infinite scroll
        viewportRef.addEventListener("scroll", () => {
            if (
                !loading.assets &&
                viewportRef.scrollTop + viewportRef.clientHeight >=
                    viewportRef.scrollHeight - viewportRef.clientHeight
            ) {
                queryStore.page += 1
                fetchAssets()
            }
        })

        searchInputRef.focus()
        fetchAssets()
    })

    // Sync search query to presets when it changes
    $effect(() => {
        if (activeTab === "presets") {
            presetQueryStore.query = queryStore.query
        }
    })
</script>

<main class="flex flex-col size-full bg-background">
    <!-- Top bar -->
    <div class="flex flex-col px-4 pt-3 pb-0 gap-3">
        <!-- Row 1: Settings + Search + Filters -->
        <div class="flex gap-2 items-center">
            <SettingsDialog />

            <SearchInput
                bind:value={queryStore.query}
                onsubmit={() => {
                    if (activeTab === "sounds") fetchAssets()
                    else { presetQueryStore.query = queryStore.query; fetchPresets() }
                }}
                class="flex-grow"
                bind:inputRef={searchInputRef}
            />

            {#if activeTab === "sounds"}
                <KeySelect
                    bind:key={queryStore.key}
                    bind:chord_type={queryStore.chord_type}
                    onselect={fetchAssets}
                />
                <BpmSelect
                    bind:bpm={queryStore.bpm}
                    bind:min_bpm={queryStore.min_bpm}
                    bind:max_bpm={queryStore.max_bpm}
                    onsubmit={fetchAssets}
                />
                <AssetCategorySelect
                    bind:asset_category_slug={queryStore.asset_category_slug}
                    onselect={fetchAssets}
                />
            {/if}
        </div>

        <!-- Row 2: Tabs -->
        <div class="flex items-center gap-1 border-b border-border">
            <button
                onclick={() => switchTab("sounds")}
                class={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px",
                    activeTab === "sounds"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                )}
            >
                <AudioLines size="14" />
                Sounds
                {#if dataStore.total_records > 0 && activeTab === "sounds"}
                    <span class="text-[10px] text-muted-foreground ml-0.5">
                        {dataStore.total_records.toLocaleString()}
                    </span>
                {/if}
            </button>
            <button
                onclick={() => switchTab("presets")}
                class={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px",
                    activeTab === "presets"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                )}
            >
                <Settings2 size="14" />
                Presets
                {#if presetStore.total_records > 0 && activeTab === "presets"}
                    <span class="text-[10px] text-muted-foreground ml-0.5">
                        {presetStore.total_records.toLocaleString()}
                    </span>
                {/if}
            </button>
        </div>
    </div>

    <!-- SOUNDS TAB -->
    {#if activeTab === "sounds"}
        <div class="flex flex-col px-4 pt-2 gap-2">
            <!-- Tags row -->
            <div
                class="transition-[height] ease-in-out overflow-clip"
                bind:this={tagsDrawerRef}
            >
                <div class="flex justify-between gap-2" bind:this={tagsContainerRef}>
                    <div
                        class={cn(
                            "min-w-0 relative",
                            !expandTags &&
                                "pr-4 after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-r after:from-transparent after:to-background after:pointer-events-none"
                        )}
                    >
                        <div
                            class={cn(
                                "flex text-nowrap gap-1 overflow-clip",
                                expandTags && "flex-wrap"
                            )}
                        >
                            {#each dataStore.tag_summary as tag}
                                {@const active = dataStore.tags.includes(tag.tag.uuid)}
                                <TagBadge
                                    label={tag.tag.label}
                                    count={tag.count}
                                    {active}
                                    onclick={() => {
                                        if (active) {
                                            dataStore.tags.splice(
                                                dataStore.tags.indexOf(tag.tag.uuid), 1
                                            )
                                        } else {
                                            dataStore.tags.push(tag.tag.uuid)
                                        }
                                        fetchAssets()
                                    }}
                                />
                            {/each}
                        </div>
                    </div>
                    {#if dataStore.tag_summary.length > 0}
                        <Button
                            variant="ghost"
                            size="icon"
                            onclick={() => {
                                expandTags = !expandTags
                                tick().then(() => {
                                    tagsDrawerRef.style.height =
                                        tagsContainerRef.offsetHeight + "px"
                                })
                            }}
                            class="shrink-0 h-6 px-4 text-muted-foreground hover:text-foreground"
                        >
                            <ChevronDown
                                size="14"
                                class={cn(
                                    "transition-transform ease-in-out duration-200",
                                    expandTags ? "rotate-180" : ""
                                )}
                            />
                        </Button>
                    {/if}
                </div>
            </div>

            <!-- Sort + count row -->
            <div class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground text-xs tabular-nums">
                    {dataStore.total_records.toLocaleString()} results
                </span>
                <div class="flex items-center gap-1.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 text-muted-foreground hover:text-foreground"
                        onclick={() => {
                            queryStore.random_seed = randomSeed()
                            queryStore.sort = "random"
                            fetchAssets()
                        }}
                    >
                        <Shuffle size="14" />
                    </Button>
                    <SortSelect
                        bind:sort={queryStore.sort}
                        onselect={fetchAssets}
                        order={queryStore.order}
                    />
                </div>
            </div>

            <!-- Column headers -->
            <div class="flex gap-2 items-center justify-between overflow-clip px-1">
                <div class="w-10 flex-shrink-0 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Pack</div>
                <div class="w-9 flex-shrink-0"></div>
                <SortHeader
                    value="name"
                    label="Filename"
                    sort={queryStore.sort}
                    order={queryStore.order}
                    onsort={updateSort}
                    class="min-w-32 w-96 flex-[3_1_auto]"
                />
                <div class="min-w-32 w-[150px] flex-grow md:block hidden"></div>
                <SortHeader
                    value="duration"
                    label="Time"
                    sort={queryStore.sort}
                    order={queryStore.order}
                    onsort={updateSort}
                    class="flex-shrink-0 w-14"
                />
                <SortHeader
                    value="key"
                    label="Key"
                    sort={queryStore.sort}
                    order={queryStore.order}
                    onsort={updateSort}
                    class="flex-shrink-0 w-14"
                />
                <SortHeader
                    value="bpm"
                    label="BPM"
                    sort={queryStore.sort}
                    order={queryStore.order}
                    onsort={updateSort}
                    class="flex-shrink-0 w-14"
                />
            </div>
            <ProgressLoading loading={loading.assets || loading.waveformsCount > 0} />
        </div>

        <ScrollArea
            class="px-4 flex-grow"
            bind:viewportRef
            onkeydown={(e) => {
                switch (e.key) {
                    case "ArrowUp":
                    case "ArrowLeft":
                        e.preventDefault(); gotoPrev(); break
                    case "ArrowDown":
                    case "ArrowRight":
                        e.preventDefault(); gotoNext(); break
                    case " ":
                        e.preventDefault(); globalAudio.togglePlay(); break
                }
            }}
        >
            <div class="flex flex-col py-1 size-full">
                {#each dataStore.sampleAssets as sampleAsset, index}
                    {@const selected = globalAudio.currentAsset?.uuid == sampleAsset.uuid}
                    <SampleListEntry
                        {sampleAsset}
                        {selected}
                        playing={selected && !globalAudio.paused}
                    />
                    {#if index < dataStore.sampleAssets.length - 1}
                        <div class="border-b border-border/50 mx-1"></div>
                    {/if}
                {:else}
                    <div class="flex flex-col gap-3 justify-center items-center size-full text-muted-foreground">
                        {#if loading.fetchError}
                            <Ghost size="36" class="opacity-50" />
                            <p class="font-semibold text-sm">Something went wrong</p>
                            <p class="text-xs opacity-60">Couldn't load samples</p>
                            <Button size="sm" variant="outline" onclick={fetchAssets}>Retry</Button>
                        {:else if loading.beforeFirstLoad}
                            <Smile size="36" class="opacity-50" />
                            <p class="font-semibold text-sm">Hey there!</p>
                            <p class="text-xs opacity-60">Make some cool music, will ya?</p>
                        {:else}
                            <Search size="36" class="opacity-50" />
                            <p class="font-semibold text-sm">No results</p>
                            <p class="text-xs opacity-60">Try different keywords</p>
                        {/if}
                    </div>
                {/each}
                {#if loading.fetchError && dataStore.sampleAssets.length > 0}
                    <div class="flex flex-col py-8 gap-2 justify-center items-center text-muted-foreground">
                        <Ghost size="36" class="opacity-50" />
                        <p class="font-semibold text-sm">Couldn't load more</p>
                        <Button size="sm" variant="outline" onclick={fetchAssets}>Retry</Button>
                    </div>
                {/if}
            </div>
        </ScrollArea>

    <!-- PRESETS TAB -->
    {:else}
        <div class="flex flex-col px-4 pt-2 gap-2">
            <!-- Tags -->
            {#if presetStore.tag_summary.length > 0}
                <div class="flex gap-1 flex-wrap overflow-hidden max-h-7">
                    {#each presetStore.tag_summary.slice(0, 20) as tag}
                        {@const active = presetStore.tags.includes(tag.tag.uuid)}
                        <TagBadge
                            label={tag.tag.label}
                            count={tag.count}
                            {active}
                            onclick={() => {
                                if (active) {
                                    presetStore.tags.splice(
                                        presetStore.tags.indexOf(tag.tag.uuid), 1
                                    )
                                } else {
                                    presetStore.tags.push(tag.tag.uuid)
                                }
                                fetchPresets()
                            }}
                        />
                    {/each}
                </div>
            {/if}

            <!-- Count row -->
            <div class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground text-xs tabular-nums">
                    {presetStore.total_records.toLocaleString()} presets
                </span>
            </div>

            <!-- Column headers for presets -->
            <div class="flex gap-2 items-center justify-between overflow-clip px-1">
                <div class="w-10 flex-shrink-0 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Pack</div>
                <div class="w-9 flex-shrink-0"></div>
                <div class="min-w-32 w-96 flex-[3_1_auto] text-[11px] text-muted-foreground font-medium uppercase tracking-wide px-1">Name</div>
                <div class="min-w-32 w-[200px] flex-grow md:block hidden text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Device</div>
                <div class="flex-shrink-0 w-20"></div>
            </div>
            <ProgressLoading loading={loading.assets} />
        </div>

        <ScrollArea class="px-4 flex-grow" bind:viewportRef={presetsViewportRef}>
            <div class="flex flex-col py-1 size-full">
                {#each presetStore.presetAssets as presetAsset, index}
                    <PresetListEntry {presetAsset} />
                    {#if index < presetStore.presetAssets.length - 1}
                        <div class="border-b border-border/50 mx-1"></div>
                    {/if}
                {:else}
                    <div class="flex flex-col gap-3 justify-center items-center size-full text-muted-foreground">
                        {#if loading.fetchError}
                            <Ghost size="36" class="opacity-50" />
                            <p class="font-semibold text-sm">Something went wrong</p>
                            <Button size="sm" variant="outline" onclick={fetchPresets}>Retry</Button>
                        {:else if presetStore.presetAssets.length === 0 && !loading.assets}
                            <Search size="36" class="opacity-50" />
                            <p class="font-semibold text-sm">No presets found</p>
                            <p class="text-xs opacity-60">Try a different search</p>
                        {:else}
                            <div class="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
                        {/if}
                    </div>
                {/each}
            </div>
        </ScrollArea>
    {/if}

    <AudioPlayer onprev={gotoPrev} onnext={gotoNext} />
</main>
