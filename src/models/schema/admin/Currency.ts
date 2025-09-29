import { timeStamp } from "console";
import mongoose,{Schema} from "mongoose";

const currencySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
}, { timestamps: true } );

export const CurrencyModel = mongoose.model("Currency", currencySchema);
