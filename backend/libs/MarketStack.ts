import axios from "axios";
import env from "../../env";

const instance = axios.create({
    baseURL: "http://api.marketstack.com/v1",
    headers: { "Content-Type": "application/json" },
    params: { access_key: env.MARKET_STACK_API_KEY }
});

export default class MarketStack {
    static async tickers() {
        const { data } = await instance.get<{
            pagination: any;
            data: Array<{
                name: string;
                symbol: string;
                has_intraday: boolean;
                has_eod: boolean;
                country: string | null;
                stock_exchange: {
                    name: string;
                    acronym: string;
                    mic: string;
                    country: string;
                    country_code: string;
                    city: string;
                    website: string;
                };
            }>;
        }>("/tickers", {
            params: { exchange: "XNAS" }
        });

        return data;
    }
}
