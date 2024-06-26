import * as Aerospike from "aerospike";
import type Key from "key";
import type Record from "record";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = new Aerospike.Config({
    hosts: [
        {
            addr: "127.0.0.1",
            port: 3000,
        },
    ],
    policies: {
        read: new Aerospike.ReadPolicy({ key: 1 }),
        write: new Aerospike.WritePolicy({ key: 1 }),
    },
});

const client = await Aerospike.connect(config);

const udfPath = path.join(__dirname, './scripts/scripts.lua')
const job = await client.udfRegister(udfPath);

const NAMESPACE = "test";

const get = async (set: string, recordKey: string): Promise<Record | null> => {
    const key = new Aerospike.Key(NAMESPACE, set, recordKey);

    const exists: boolean = await client.exists(key);
    if (!exists) return null;

    const record: Record = await client.get(key);

    return {
        ...record,
        bins: {
            ...record.bins,
            id: key.key,
        },
    };
};

const remove = async (set: string, recordKey: string): Promise<Record> => {
    const key = new Aerospike.Key(NAMESPACE, set, recordKey);

    const record = await client.remove(key);

    return record;
};

const put = async (
    set: string,
    recordKey: string,
    bins: object,
): Promise<Key> => {
    const key = new Aerospike.Key(NAMESPACE, set, recordKey);

    const record = await client.put(key, bins);

    return record;
};

const shutdown = async () => {
    await client.close();
};

export {
    client,
    get,
    put,
    remove,
    shutdown,
};
