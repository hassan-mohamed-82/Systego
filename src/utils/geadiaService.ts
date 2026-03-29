import { BadRequest } from "../Errors/BadRequest";
import axios from "axios";

type GeideaConfig = {
    publicKey: string;
    apiPassword: string;
};

type GeideaInitInput = {
    localOrderId: string;
    amount: number;
    geideaConfig: GeideaConfig;
    customer: any;
    address: any;
};

type GeideaSessionResponse = {
    session?: {
        id?: string;
    };
};

export const initializeGeideaPayment = async ({
    localOrderId,
    amount,
    geideaConfig,
    customer,
    address,
}: GeideaInitInput) => {
    const credentials = Buffer.from(`${geideaConfig.publicKey}:${geideaConfig.apiPassword}`).toString("base64");
    const authHeader = `Basic ${credentials}`;

    const response = await axios.post<GeideaSessionResponse>(
        "https://api.geidea.net/pgw/api/v1/direct/session",
        {
            amount: amount,
            currency: "EGP",
            merchantReferenceId: localOrderId,
            callbackUrl: "https://bcknd.systego.net/api/store/order/webhook/geidea",
            returnUrl: "https://your-frontend.com/payment/success",
            customerEmail: customer?.email || "no-reply@example.com",
            billingAddress: {
                street: address?.street || "NA",
                city: (address?.city as any)?.name || "NA",
                country: "EGY",
            },
        },
        {
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        }
    );

    const data = response.data as GeideaSessionResponse;

    if (!data?.session?.id) {
        throw new BadRequest("Failed to create Geidea session");
    }

    return {
        geideaSessionId: data.session.id,
        iframeUrl: `https://pay.geidea.net/hosted?sessionId=${data.session.id}`,
    };
};