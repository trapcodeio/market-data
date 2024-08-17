import type JobHelper from "xpresser/src/Console/JobHelper";
import { jsb, jsb_Prices } from "../jsb";
import TwelveData from "../libs/TwelveData";
import { sleep } from "../utils";

/**
 *  Job: import:logos
 */
export = {
    // Job Handler
    async handler(args: string[], job: JobHelper): Promise<any> {
        const $ = job.$;

        const hasPrices = await jsb.hasOwnDocument("market-data/assets/prices");
        if (!hasPrices) return $.logErrorAndExit("Prices document not found.");

        const prices = await jsb_Prices();
        if (!prices) return $.logErrorAndExit("Failed to get prices.");

        // prices is assumed to be the total number of assets
        // we can use this to get logos
        const logos: Record<string, string> = await jsb.getOwnContent(
            "market-data/assets/logos"
        );
        const total = Object.keys(prices).length;
        let count = 0;

        for (let symbol in prices) {
            count++;
            if (logos[symbol]) {
                $.logInfo(`Logo already exists for ${symbol} - ${count}/${total}`);
                continue;
            }

            $.logInfo(`Fetching logo for ${symbol} - ${count}/${total}`);

            const logo = await TwelveData.getLogo(symbol);
            if (!logo.url && !logo.logo_base) {
                $.logError(`Failed to get logo for ${symbol}`);
                continue;
            }

            // console.log({ symbol, url });
            logos[symbol] = logo.url || logo.logo_base!;

            await sleep(3000);
        }

        // Save logos to file
        const logosFile = "market-data/assets/logos";
        const logosDocExists = await jsb.hasOwnDocument(logosFile);

        if (logosDocExists) {
            $.logInfo("Updating logos document...");
            await jsb.updateOwnDocument(logosFile, logos);
        } else {
            $.logInfo("Creating logos document...");
            await jsb.createDocument({
                name: "logos",
                content: logos,
                project: "market-data",
                folder: "assets"
            });
        }

        // End current job process.
        return job.end();
    }
};
