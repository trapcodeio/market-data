import type JobHelper from "xpresser/src/Console/JobHelper";
import MarketStack from "../libs/MarketStack";
import { jsb } from "../jsb";
import TwelveData from "../libs/TwelveData";
import TwelveDataPrice, {
    AssetType,
    TwelveDataPriceDataType
} from "../models/TwelveDataPrice";
import Xpresser from "xpresser/types";

/**
 *  Job: import:assets
 */
export = {
    // Job Handler
    async handler(args: string[], job: JobHelper): Promise<any> {
        const $ = job.$;
        let data: TwelveDataPriceDataType[] = [];

        data = await getStocks($, data);
        data = await getForex($, data);
        data = await getCommodities($, data);

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

const unsupportedForexSymbols = ["NG/USD", "NG/EUR", "NG/GBP"];
async function getForex($: Xpresser.DollarSign, data: TwelveDataPriceDataType[]) {
    $.log("Fetching Forex symbols from TwelveData");
    const forexSymbols = await TwelveData.forexList();
    const forexHasDoc = await jsb.hasOwnDocument("market-data/assets/forex-list");

    for (const s of forexSymbols.data) {
        if (unsupportedForexSymbols.includes(s.symbol)) {
            $.logError(`Skipping unsupported symbol ${s.symbol}`);
            continue;
        }

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
            "market-data/assets/forex-list",
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
            content: forexSymbols,
            folder: "assets"
        });
    }

    return data;
}

async function getCommodities($: Xpresser.DollarSign, data: TwelveDataPriceDataType[]) {
    $.log("Fetching Commodities symbols from TwelveData");
    const commoditiesSymbols = await TwelveData.commoditiesList();
    const commoditiesHasDoc = await jsb.hasOwnDocument(
        "market-data/assets/commodities-list"
    );

    for (const s of commoditiesSymbols.data) {
        data.push({
            symbol: s.symbol,
            type: AssetType.Commodity,
            price: 0,
            updatedAt: new Date(),
            createdAt: new Date(),
            isMarketOpen: true
        });
    }

    if (commoditiesHasDoc) {
        // update document
        $.logInfo("Updating commodities-list.json");
        const res = await jsb.updateOwnDocument(
            "market-data/assets/commodities-list",
            commoditiesSymbols.data
        );

        if (!res.changed) {
            $.logCalmly("No changes detected in commodities-list.json");
        }
    } else {
        // create document
        $.logInfo("Creating commodities-list.json");
        await jsb.createDocument({
            name: "commodities-list",
            project: "market-data",
            content: commoditiesSymbols.data,
            folder: "assets"
        });
    }

    return data;
}

const unsupportedStockSymbols = ["ATVI", "SPLK", "CERN", "ALXN", "SGEN"];

async function getStocks($: Xpresser.DollarSign, data: TwelveDataPriceDataType[]) {
    $.log("Fetching stock symbols from MarketStack");
    const stocks = await MarketStack.tickers();
    const hasDoc = await jsb.hasOwnDocument("market-data/assets/stocks-list");
    const newStockData: typeof stocks.data = [];

    console.log(stocks.pagination);

    for (const s of stocks.data) {
        // skip unsupported symbols
        if (unsupportedStockSymbols.includes(s.symbol)) {
            $.logError(`Skipping unsupported symbol ${s.symbol}`);
            continue;
        }

        // change symbol FB to META
        if (s.symbol === "FB") s.symbol = "META";

        data.push({
            symbol: s.symbol,
            price: 0,
            type: AssetType.Stock,
            createdAt: new Date(),
            updatedAt: new Date(),
            isMarketOpen: false
        });

        newStockData.push(s);
    }

    stocks.data = newStockData;

    if (hasDoc) {
        // update document
        $.logInfo("Updating stocks-list.json");
        const res = await jsb.updateOwnDocument("market-data/assets/stocks-list", stocks);
        if (!res.changed) {
            $.logCalmly("No changes detected in stocks-list.json");
        }
    } else {
        // create document
        $.logInfo("Creating stocks-list.json");
        await jsb.createDocument({
            name: "stocks-list",
            project: "market-data",
            content: stocks,
            folder: "assets"
        });
    }

    return data;
}
