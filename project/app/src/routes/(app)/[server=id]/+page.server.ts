import userStore from "$lib/stores/user";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { get } from "svelte/store";

// If we reach this loader it means that there has been a request for '/[server]', redirect to the correct channel page
export const load: PageServerLoad = async ({ parent, params: { server } }) => {
    const user = get(userStore);

    if (!user) {
        redirect(303, "/login");
    } else {
        const lastServerChannel = user.servers[server];

        redirect(307, `/${server}/${lastServerChannel}`);
    }
};
