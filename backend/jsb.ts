import { JsonBank } from "jsonbank";
import env from "../env";

export const jsb = new JsonBank({
    keys: {
        pub: env.JSB_PUB_KEY,
        prv: env.JSB_PRV_KEY
    }
});
