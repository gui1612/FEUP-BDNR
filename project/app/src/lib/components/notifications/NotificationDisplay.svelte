<script lang="ts">
    import Notification from "./Notification.svelte";

    import {
        dismissNotification,
        notifications,
    } from "$lib/stores/notifications";
</script>

{#if $notifications}
    <section
        class="fixed bottom-0 left-10 z-10 mb-4 flex w-1/4 flex-col items-center gap-3"
    >
        {#each $notifications as notification (notification.id)}
            <Notification
                type={notification.type}
                dismissible={notification.dismissible}
                on:dismiss={() => dismissNotification(notification.id)}
                >{notification.message}</Notification
            >
        {/each}
    </section>
{/if}
