import type JobHelper from "xpresser/src/Console/JobHelper";
import MarketStack from "../libs/MarketStack";
import { jsb } from "../jsb";
import TwelveData from "../libs/TwelveData";
import TwelveDataPrice, {
    AssetType,
    TwelveDataPriceDataType
} from "../models/TwelveDataPrice";
import { sleep } from "../utils";

/**
 *  Job: import:assets
 */
export = {
    // Job Handler
    async handler(args: string[], job: JobHelper): Promise<any> {
        const $ = job.$;
        let data: TwelveDataPriceDataType[] = [];

        $.log("Fetching stock symbols from MarketStack");
        const stocks = await MarketStack.tickers();
        const hasDoc = await jsb.hasOwnDocument("market-data/stocks-list");
        // const badSymbols = [] as string[];
        let count = 0;
        const newStockData: typeof stocks.data = [];

        for (const s of stocks.data) {
            count++;
            // change symbol FB to META
            if (s.symbol === "FB") s.symbol = "META";

            // try validating each symbol
            try {
                $.logInfo(
                    `Validating symbol ${s.symbol} - ${count}/${stocks.data.length}`
                );

                const priceData = await TwelveData.getSingleRealtimePrice(s.symbol);
                if (priceData && priceData.price) {
                    const p = parseFloat(priceData.price);
                    if (isNaN(p)) {
                        $.logError(`Failed to validate price for ${s.symbol}`);
                    } else {
                        // console.log({ price: priceData, symbol: s.symbol });
                        const price = parseFloat(priceData.price) ?? 0;
                        data.push({
                            symbol: s.symbol,
                            price,
                            type: AssetType.Stock,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            isMarketOpen: false
                        });

                        newStockData.push(s);
                    }
                } else {
                    $.logError(`Failed to validate price for ${s.symbol}`);
                }
            } catch (e) {
                $.logError(`Failed to get price for ${s.symbol}`);
            }

            // sleep for 2 seconds to avoid rate limiting
            await sleep(2000);
        }

        stocks.data = newStockData;

        if (hasDoc) {
            // update document
            $.logInfo("Updating stocks-list.json");
            const res = await jsb.updateOwnDocument("market-data/stocks-list", stocks);
            if (!res.changed) {
                $.logCalmly("No changes detected in stocks-list.json");
            }
        } else {
            // create document
            $.logInfo("Creating stocks-list.json");
            await jsb.createDocument({
                name: "stocks-list",
                project: "market-data",
                content: stocks
            });
        }

        $.log("Fetching Forex symbols from TwelveData");
        const forexSymbols = await TwelveData.forexList();
        const forexHasDoc = await jsb.hasOwnDocument("market-data/forex-list");

        for (const s of forexSymbols.data) {
            data.push({
                symbol: s.symbol,
                type: AssetType.Forex,
                price: 0,
                updatedAt: new Date(),
                createdAt: new Date(),
                isMarketOpen: false
            });
        }

        if (forexHasDoc) {
            // update document
            $.logInfo("Updating forex-list.json");
            const res = await jsb.updateOwnDocument(
                "market-data/forex-list",
                forexSymbols
            );

            if (!res.changed) {
                $.logCalmly("No changes detected in forex-list.json");
            }
        } else {
            // create document
            $.logInfo("Creating forex-list.json");
            await jsb.createDocument({
                name: "forex-list",
                project: "market-data",
                content: forexSymbols
            });
        }

        data = TwelveDataPrice.makeManyData<TwelveDataPriceDataType>(data, {
            validate: true,
            stopOnError: true
        });

        // delete all old prices
        await TwelveDataPrice.native().deleteMany({});
        // insert new prices
        await TwelveDataPrice.native().insertMany(data);

        $.logInfo(`Imported ${data.length} assets.`);

        // End current job process.
        return job.end();
    }
};
