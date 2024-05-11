import userStore from "$lib/stores/user";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { get } from "svelte/store";

// If we get a request for this page it means the user has navigated to '/', load the last server the user has visited and proceed.
export const load: PageServerLoad = async ({ cookies }) => {
    const user = cookies.get('user');

    if (!user) {
        throw redirect(303, "/login");
    } else {
        throw redirect(307, `/@me`);
    }
};