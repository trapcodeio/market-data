import type JobHelper from "xpresser/src/Console/JobHelper";
import TwelveData from "../libs/TwelveData";
import env from "../../env";
import TwelveDataPrice from "../models/TwelveDataPrice";
import { jsb } from "../jsb";
import { sleep } from "../utils";

/**
 *  Job: Update:prices
 */
export = {
    // Job Handler
    async handler(args: string[], job: JobHelper): Promise<any> {
        const $ = job.$;

        // first check if we can afford requests
        const usage = await TwelveData.apiUsage();
        const limitPerMinute = env.TWELVE_DATA_API_LIMIT_PER_MINUTE ?? 55;
        let limitsRemaining = limitPerMinute - usage.current_usage; // 5 is for safety
        if (limitsRemaining <= 5) return $.logErrorAndExit("API Limit Reached");

        limitsRemaining = limitsRemaining - 5;
        // divide and round down
        // because half will be used to fetch prices
        // and the other half will be used to get quotes
        limitsRemaining = Math.floor(limitsRemaining / 2);

        // get all symbols not updated in the past 5-minutes
        // limit by limitsRemaining
        const data = await TwelveDataPrice.find(
            { updatedAt: { $lt: new Date(Date.now() - 1000 * 60 * 5) } },
            {
                limit: limitsRemaining,
                sort: { updatedAt: 1 },
                projection: { symbol: 1 }
            }
        );

        if (!data.length) {
            $.logCalmly("No prices to update");
            return job.end();
        }

        const symbols = data.map((d) => d.symbol);

        // fetch prices
        $.logInfo(`Fetching prices for ${symbols.length} symbols`);
        const prices = await TwelveData.getRealtimePrice(symbols);
        const quotes = await TwelveData.getStocksQuotes(symbols);
        const bulkWriteQuery: any[] = [];

        for (const symbol in prices) {
            const price = prices[symbol];
            if (!price || !price.price) {
                $.logError(`Failed to get price for ${symbol}`);
                continue;
            }

            const $set: Record<string, any> = {
                price: parseFloat(price.price),
                updatedAt: new Date()
            };

            const quote = quotes[symbol];
            if (quote) {
                $set.isMarketOpen = quote.is_market_open;
                $set.data = {
                    open: parseFloat(quote.open),
                    high: parseFloat(quote.high),
                    low: parseFloat(quote.low),
                    close: parseFloat(quote.close),
                    volume: parseFloat(quote.volume),
                    previousClose: parseFloat(quote.close),
                    change: parseFloat(quote.change),
                    changePercent: parseFloat(quote.percent_change)
                };
            }

            bulkWriteQuery.push({
                updateOne: {
                    filter: { symbol },
                    update: { $set: $set }
                }
            });
        }

        if (bulkWriteQuery.length) {
            $.logInfo("Updating prices");
            await TwelveDataPrice.native().bulkWrite(bulkWriteQuery);
        }

        await sleep(2000);

        // refetch all prices to store in jsonbank
        const allPrices = await TwelveDataPrice.find(
            {},
            {
                projection: TwelveDataPrice.projectPublicFields()
            }
        );

        $.logInfo("Saving prices to jsonbank");
        const docPath = "market-data/prices";
        const hasDoc = await jsb.hasOwnDocument(docPath);

        if (hasDoc) {
            $.logInfo("Updating prices.json");
            // update document
            const res = await jsb.updateOwnDocument(docPath, allPrices);
            if (!res.changed) {
                $.logCalmly("No changes detected in prices.json");
            }
        } else {
            $.logInfo("Creating prices.json");
            // create document
            await jsb.createDocument({
                name: "prices",
                project: "market-data",
                content: allPrices
            });
        }

        $.logSuccess(`Updated ${bulkWriteQuery.length} prices`);

        // End current job process.
        return job.end();
    }
};
