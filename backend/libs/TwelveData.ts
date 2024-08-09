import axios from "axios";
import env from "../../env";

const instance = axios.create({
    baseURL: "https://api.twelvedata.com",
    headers: { "Content-Type": "application/json" },
    params: { apikey: env.TWELVE_DATA_API_KEY }
});

export default class TwelveData {
    static async getRealtimePrice<T extends Record<string, any>>(symbols: string[]) {
        // if T is not provided, Type should be Record<string, { price: string }>
        type Type = T extends undefined ? Record<string, { price: string }> : T;
        const { data } = await instance.get<Type>("/price", {
            params: { symbol: symbols.join(",") }
        });

        return data;
    }

    static async getSingleRealtimePrice(symbol: string) {
        return this.getRealtimePrice<{ price: string }>([symbol]);
    }

    /**
     * Get Stock Symbols
     * @deprecated
     * This is not used, "marketdata" is used instead.
     */
    static async stocksList() {
        const { data } = await instance.get<{
            data: Array<{
                symbol: string;
                name: string;
                currency: string;
                exchange: string;
                mic_code: string;
                country: string;
                type: string;
                access: {
                    global: string;
                    plan: "Basic" | "Grow" | "Pro";
                };
            }>;
        }>("/stocks", {
            params: {
                exchange: "NASDAQ",
                show_plan: true
            }
        });

        return data;
    }

    static async forexList() {
        const { data } = await instance.get<{
            data: Array<{
                symbol: string;
                currency_group: string;
                currency_base: string;
                currency_quote: string;
            }>;
        }>("/forex_pairs", {
            params: {
                currency_quote: "USD"
            }
        });

        return data;
    }

    static async commoditiesList() {
        const { data } = await instance.get<{
            data: Array<{
                symbol: string;
                name: string;
                category: string;
                description: string;
            }>;
        }>("/forex_pairs", {
            params: {
                currency_quote: "USD"
            }
        });

        return data;
    }

    static async getLogo(symbol: string) {
        const { data } = await instance.get<{
            meta: { symbol: string };
            url: string;
            logo_base?: string;
        }>(`/logo`, {
            params: {
                symbol
            }
        });
        return data;
    }

    static async apiUsage() {
        const { data } = await instance.get<{
            timestamp: string;
            current_usage: number;
            plan_limit: number;
        }>(`/api_usage`);

        return data;
    }

    static async getStocksQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
        const { data } = await instance.get<Record<string, StockQuote>>("/quote", {
            params: { symbol: symbols.join(",") }
        });

        return data;
    }

    static async getSingleStockQuote(symbol: string) {
        const res = await this.getStocksQuotes([symbol]);
        return res as unknown as StockQuote;
    }
}

type StockQuote = {
    name: string;
    exchange: string;
    mic_code: string;
    currency: string;
    datetime: string;
    timestamp: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    previous_close: string;
    change: string;
    percent_change: string;
    average_volume: string;
    is_market_open: boolean;
    fifty_two_week: {
        low: string;
        high: string;
        low_change: string;
        high_change: string;
        low_change_percent: string;
        high_change_percent: string;
        range: string;
    };
};
