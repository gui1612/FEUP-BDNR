<script lang="ts">
    import type { ChannelPreview } from "$lib/types";
    import Icon from "../Icon.svelte";

    export let channel: ChannelPreview;
</script>

<div class="w-full">
    <a
        href="/{channel.server}/{channel.id}"
        class="inline-flex w-full justify-center gap-1 px-4 py-2 transition duration-300 hover:bg-gray-600"
    >
        <span>#</span>
        <span>{channel.name}</span>
    </a>
</div>
    