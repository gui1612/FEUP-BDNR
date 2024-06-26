import { client, get as dbGet, put, remove } from "$lib/service/db";
import { sign } from "$lib/service/jwt";
import { ServerSchema, UserSchema, type Channel } from "$lib/types";
import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import * as Aerospike from "aerospike";
import type Record from "record";

// If we reach this loader it means that there has been a request for '/[server]', redirect to the correct channel page
export const load: PageServerLoad = async ({
    parent,
    params: { server },
    cookies,
}) => {
    const userStr = cookies.get("user");

    if (!userStr) {
        redirect(303, "/login");
    } else {
        const { channels } = await parent();
        const user = UserSchema.parse(JSON.parse(userStr));

        if (channels.length === 0) {
            // TODO: better logic
            redirect(303, `/user/${user.username}`);
        }

        const channelId = channels[0].id; // TODO: should we do this differently?

        redirect(307, `/${server}/${channelId}`);
    }
};

export const actions: Actions = {
    generateInviteToken: async ({ request }) => {
        const formData = await request.formData();

        const serverPreview = JSON.parse(formData.get("payload") as string);

        const token = sign(serverPreview);

        return { token };
    },
    leaveServer: async ({ request, cookies, params }) => {
        const userStr = cookies.get("user");

        if (!userStr) return fail(401);

        const user = UserSchema.parse(JSON.parse(userStr));

        const serverID = params.server;
        const server = await dbGet("servers", serverID);
        const serverMembers = server?.bins.members;
        const serverOwner = server?.bins.owner;

        const userNotInServer = Object.keys(serverMembers)
                                      .filter((member) => { return member === user.id; })
                                      .length === 0;

        if (userNotInServer) return fail(401);

        const serverOperations = []; 
        if (serverOwner.id === user.id) {

            const otherMembers = Object.values(serverMembers)
                                       .filter((member) => { return member.id !== user.id; });

            const newOwner = otherMembers[Math.floor(Math.random() * otherMembers.length)];

            serverOperations.push(
                Aerospike.maps.put('owner', 'id', newOwner.id),
                Aerospike.maps.put('owner', 'username', newOwner.username)
            )

        }

        serverOperations.push(Aerospike.maps.removeByKey('members', user.id));

        await client.operate(
            new Aerospike.Key('test', 'servers', serverID), 
            serverOperations
        );

        await client.operate(
            new Aerospike.Key("test", "users", user.id), [
            Aerospike.maps.removeByKey("servers", serverID),
        ]);

        delete user.servers[serverID];
        cookies.set(
            "user",
            JSON.stringify({
                ...user,
            }),
            {
                path: "/",
                maxAge: 60 * 60 * 24 * 14, // 14 days
            },
        );

        redirect(303, `/user/${user.id}`); 
    },
    deleteServer: async ({ request, cookies, params }) => {
        const userStr = cookies.get("user");

        if (!userStr) return fail(401);

        const user = UserSchema.parse(JSON.parse(userStr));

        const serverID = params.server;
        const server = await dbGet("servers", serverID);
        const serverOwner = server?.bins.owner;

        if (user.id !== serverOwner.id) {
            redirect(303, `/${serverID}`);
        }

        await remove("servers", serverID);
        await client.operate(new Aerospike.Key("test", "users", user.id), [
            Aerospike.maps.removeByKey("servers", serverID),
        ]);

        const query = client.query("test", "channels");
        query.where(Aerospike.filter.equal("server", serverID));

        const results: Record[] = await query.results();

        const job = await query.operate([Aerospike.operations.delete()]);
        await job.waitUntilDone();

        const messages = results.map((record) => record.bins.messages).flat();
        for (const message of messages) {
            await remove("messages", message);
        }

        delete user.servers[serverID];
        cookies.set(
            "user",
            JSON.stringify({
                ...user,
            }),
            {
                path: "/",
                maxAge: 60 * 60 * 24 * 14, // 14 days
            },
        );

        redirect(303, `/user/${user.id}`);
    },
    createChannel: async ({ request, params, cookies }) => {

        const userStr = cookies.get("user");

        if (!userStr) return fail(401);

        const formData = await request.formData();
        const channelName = formData.get('channel') as string;
        
        const serverID = params.server;
        
        const channelID = `channel-${Math.random()}`;
        const channel: Omit<Channel, "id"> = {
            name: channelName,
            server: serverID,
            messages: [],
        };

        const serverChannel: Omit<Channel, "messages"> = {
            id: channelID,
            name: channelName,
            server: serverID
        };

        await put('channels', channelID, channel);
        await client.operate(
            new Aerospike.Key('test', 'servers', serverID), [
            Aerospike.maps.put('channels', channelID, serverChannel)
        ]);

        redirect(303, `/${serverID}/${channelID}`);

    },
    deleteChannel: async ({ request, cookies, params }) => {
        const userStr = cookies.get("user");

        if (!userStr) return fail(401);

        const formData = await request.formData();

        const channelID = formData.get('channel') as string;
        const serverID = params.server;

        const channel = await dbGet('channels', channelID);        
        const channelMessages = channel?.bins.messages ?? [];

        await client.operate(
            new Aerospike.Key('test', 'servers', serverID), [
            Aerospike.maps.removeByKey('channels', channelID)
        ]);

        for (const message of channelMessages) {
            await remove('messages', message);
        }
        
        redirect(303, `/${serverID}`);

    }
};
