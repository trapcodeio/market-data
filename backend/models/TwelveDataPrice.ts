import { is, XMongoModel, XMongoSchema } from "xpress-mongo";
import { UseCollection } from "@xpresser/xpress-mongo";

export enum AssetType {
    Stock = "stock",
    Crypto = "crypto",
    Forex = "forex"
}
/**
 * Interface for Model's `this.data`. (For Typescript)
 * Optional if accessing data using model helper functions
 */
export interface TwelveDataPriceDataType {
    type: AssetType;
    symbol: string;
    price: number;
    updatedAt?: Date;
    createdAt: Date;
    data?: {
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
        previousClose?: number;
        change?: number;
        changePercent?: number;
    };
}

class TwelveDataPrice extends XMongoModel {
    /**
     * Model Schema
     */
    static schema: XMongoSchema<TwelveDataPriceDataType> = {
        type: is.InArray(Object.values(AssetType)).required(),
        symbol: is.String().required(),
        price: is.Number().required(),
        updatedAt: is.Date(),
        data: is.Object().optional(),
        createdAt: is.Date().required()
    };

    // Public Fields
    static publicFields = ["type", "symbol", "price", "updatedAt", "data"];

    // SET Type of this.data.
    public data!: TwelveDataPriceDataType;
}

/**
 * Map Model to Collection: `twelve_data_prices`
 * .native() will be made available for use.
 */
UseCollection(TwelveDataPrice, "twelve_data_prices");

// Export Model as Default
export default TwelveDataPrice;
