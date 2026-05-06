import { querySplice, SamplesSearch, PresetsSearch } from "$lib/splice/api"
import { descrambleSample } from "$lib/splice/descrambler"
import type {
    AssetCategorySlug,
    AssetSortType,
    ChordType,
    Key,
    SampleAsset,
    PresetAsset,
    SamplesSearchResponse,
    PresetsSearchResponse,
    SortOrder,
    TagSummaryEntry,
} from "$lib/splice/types"
import { globalAudio } from "./audio.svelte"
import { loading } from "./loading.svelte"
import { fetch } from "@tauri-apps/plugin-http"

export const DEFAULT_SORT = "relevance"
export const PER_PAGE = 50

export const randomSeed = () =>
    Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString()

export const dataStore = $state({
    sampleAssets: [] as SampleAsset[],
    descrambledSamples: new Map<string, string>(),
    tags: [] as string[],
    tag_summary: [] as TagSummaryEntry[],
    total_records: 0,
})

export const presetStore = $state({
    presetAssets: [] as PresetAsset[],
    tags: [] as string[],
    tag_summary: [] as TagSummaryEntry[],
    total_records: 0,
})

export const keys = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
] as const
export const chord_types = ["major", "minor"]

export const queryStore = $state({
    query: "",
    sort: DEFAULT_SORT as AssetSortType,
    random_seed: randomSeed(),
    order: "DESC" as SortOrder,
    page: 1,
    asset_category_slug: null as AssetCategorySlug | null,
    bpm: null as string | null,
    min_bpm: null as number | null,
    max_bpm: null as number | null,
    key: null as Key | null,
    chord_type: null as ChordType | null,
})

// The query identity is the part of the query that uniquely identifies the returned data
// It is used to determine if the fetched data should replace the current data, be appended to it, or be ignored
const queryIdentity = $derived({
    query: queryStore.query,
    sort: queryStore.sort,
    order: queryStore.order,
    random_seed: queryStore.random_seed,
    tags: dataStore.tags,
    asset_category_slug: queryStore.asset_category_slug,
    bpm: queryStore.bpm?.toString(),
    min_bpm: queryStore.min_bpm,
    max_bpm: queryStore.max_bpm,
    key: queryStore.key,
    chord_type: queryStore.chord_type,
})

export const storeCallbacks = $state({
    onbeforedataupdate: null as (() => void) | null,
    onbeforetagsupdate: null as (() => void) | null,
})

let currentQueryIdentity: string = ""

export const fetchAssets = () => {
    const identityBeforeFetch = JSON.stringify(queryIdentity)
    if (identityBeforeFetch != currentQueryIdentity) {
        storeCallbacks.onbeforedataupdate?.()
    }
    loading.assets = true
    querySplice(SamplesSearch, {
        ...queryIdentity,
        page: queryStore.page,
        limit: PER_PAGE,
    })
        .then((response) => {
            const searchResult = (response as SamplesSearchResponse).data
                .assetsSearch
            const identityAfterFetch = JSON.stringify(queryIdentity)
            if (identityBeforeFetch == identityAfterFetch) {
                if (identityBeforeFetch == currentQueryIdentity) {
                    dataStore.sampleAssets.push(...searchResult.items)
                    console.info("➕ Loaded more assets")
                } else {
                    // Free descrambled samples that are not in the new search result / currently selected
                    for (const sampleAsset of dataStore.sampleAssets) {
                        if (
                            !searchResult.items.some(
                                (other) => sampleAsset.uuid == other.uuid
                            ) &&
                            sampleAsset.uuid != globalAudio.currentAsset?.uuid
                        ) {
                            freeDescrambledSample(sampleAsset.uuid)
                        }
                    }
                    // Prevent duplicates
                    dataStore.sampleAssets = searchResult.items.filter(
                        (asset) =>
                            !dataStore.sampleAssets.some(
                                (other) => other.uuid == asset.uuid
                            )
                    )
                    currentQueryIdentity = identityAfterFetch
                    queryStore.page = 1
                    console.info("🔄️ Loaded new assets")
                }
                dataStore.total_records = searchResult.response_metadata.records

                storeCallbacks.onbeforetagsupdate?.()
                dataStore.tag_summary = searchResult.tag_summary

                loading.assets = false
                loading.beforeFirstLoad = false

                loading.fetchError = null
            } else {
                console.info("🕜 Ignored stale assets")
            }
        })
        .catch((error: Error) => {
            console.error("⚠️ Failed to fetch assets", error)
            loading.fetchError = error
            loading.assets = false
        })
}

export async function getDescrambledSampleURL(sampleAsset: SampleAsset) {
    const existingBlobURL = dataStore.descrambledSamples.get(sampleAsset.uuid)
    if (existingBlobURL) {
        console.info("✔️ Reusing descrambled sample blob")
        return existingBlobURL
    }

    loading.samples.add(sampleAsset.uuid)
    loading.samplesCount++

    const response = await fetch(sampleAsset.files[0].url)

    const data = new Uint8Array(await response.arrayBuffer())

    const descrambledData = descrambleSample(data)

    const blob = new Blob([descrambledData], {
        type: "audio/mp3",
    })

    const blobURL = window.URL.createObjectURL(blob)

    dataStore.descrambledSamples.set(sampleAsset.uuid, blobURL)

    loading.samples.delete(sampleAsset.uuid)
    loading.samplesCount--

    console.info("🔗 Created descrambled sample blob")

    return blobURL
}

export function freeDescrambledSample(uuid: string) {
    const existingBlobURL = dataStore.descrambledSamples.get(uuid)
    if (!existingBlobURL) return false

    dataStore.descrambledSamples.delete(uuid)
    window.URL.revokeObjectURL(existingBlobURL)
    console.info("⛓️‍💥 Freed descrambled sample")

    return true
}

export const presetQueryStore = $state({
    query: "",
    sort: "popularity" as AssetSortType,
    random_seed: randomSeed(),
    order: "DESC" as SortOrder,
    page: 1,
})

let currentPresetQueryIdentity: string = ""

export const fetchPresets = () => {
    const identity = JSON.stringify({
        query: presetQueryStore.query,
        sort: presetQueryStore.sort,
        order: presetQueryStore.order,
        random_seed: presetQueryStore.random_seed,
        tags: presetStore.tags,
    })

    loading.assets = true

    querySplice(PresetsSearch, {
        query: presetQueryStore.query || null,
        sort: presetQueryStore.sort,
        order: presetQueryStore.order,
        random_seed: presetQueryStore.random_seed,
        tags: presetStore.tags,
        page: presetQueryStore.page,
        limit: PER_PAGE,
    })
        .then((response) => {
            const result = (response as PresetsSearchResponse).data.assetsSearch
            if (identity === currentPresetQueryIdentity) {
                presetStore.presetAssets.push(...result.items)
                console.info("➕ Loaded more presets")
            } else {
                presetStore.presetAssets = result.items
                currentPresetQueryIdentity = identity
                presetQueryStore.page = 1
                console.info("🔄️ Loaded new presets")
            }
            presetStore.total_records = result.response_metadata.records
            presetStore.tag_summary = result.tag_summary
            loading.assets = false
            loading.fetchError = null
        })
        .catch((error: Error) => {
            console.error("⚠️ Failed to fetch presets", error)
            loading.fetchError = error
            loading.assets = false
        })
}
