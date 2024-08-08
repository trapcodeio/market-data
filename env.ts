import { Env } from "@xpresser/env";
import { resolve } from "path";

const env = Env(
    resolve(".env"),
    {
        NODE_ENV: Env.is.enum(["development", "production"] as const),

        APP_NAME: Env.is.string("My Xpresser App"),
        APP_PORT: Env.is.number(3000),
        APP_HOST: Env.optional.string("Localhost"),

        DB_SERVER: Env.is.string("mongodb://127.0.0.1:27017"),
        DB_NAME: Env.is.string(),
        DB_PASSWORD: Env.optional.string(),

        TWELVE_DATA_API_KEY: Env.is.string(),
        TWELVE_DATA_API_LIMIT_PER_MINUTE: Env.is.number(55),
        MARKET_STACK_API_KEY: Env.is.string(),

        JSB_PUB_KEY: Env.is.string(),
        JSB_PRV_KEY: Env.is.string()
    },
    { expose: true }
);

export default env;
