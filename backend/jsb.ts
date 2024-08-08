import { JsonBank } from "jsonbank";
import env from "../env";

export const jsb = new JsonBank({
    keys: {
        pub: env.JSB_PUB_KEY,
        prv: env.JSB_PRV_KEY
    }
});

type Price = {
    type: string;
    symbol: string;
    price: number;
    updatedAt: string;
    data: {
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        previousClose: number;
        change: number;
        changePercent: number;
    };
};
export async function jsb_Prices() {
    const res = await jsb.getOwnContent<Array<Price>>("market-data/prices");

    return res.reduce(
        (acc, cur) => {
            acc[cur.symbol] = cur;
            return acc;
        },
        {} as Record<string, Price>
    );
}
