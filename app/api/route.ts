import {NextRequest} from "next/server";
import axios from 'axios';
import CryptoJS from 'crypto-js';


async function fetchFromAdOrbit(url: string, method: string, headers?: {}) {
    const API_KEY = process.env.API_KEY;
    const API_PUB = process.env.PUBLIC_KEY;



    // Check if API key is provided
    if (!API_KEY) {
        console.error('Error: API_KEY is required. Please set it in your .env file.');
        process.exit(1);
    }


    const msg = method.toUpperCase() + "\n" + url;

    const hash = CryptoJS.HmacSHA512(msg, API_KEY);
    const crypt = CryptoJS.enc.Utf8.parse(hash.toString());
    const base64 = CryptoJS.enc.Base64.stringify(crypt);

    const res = await axios.get(url, {
        headers: {
            Authorization: "ADORBIT " + API_PUB + ":" + base64,
            Accept: 'application/json',
            Method: method,
            ...headers
        }
    });

    return res.data;
}

export async function GET(req: NextRequest) {

// Configuration
    const API_BASE_URL = process.env.API_BASE_URL || 'https://api.adorbit.com';
    const API_KEY = process.env.API_KEY;
    const API_PUB = process.env.PUBLIC_KEY;

// Check if API key is provided
    if (!API_KEY) {
        console.error('Error: API_KEY is required. Please set it in your .env file.');
        process.exit(1);
    }

    const routes = await fetchFromAdOrbit(API_BASE_URL+"/", 'GET');

    const ticketRoute: string = routes.tickets;

    function getSixMonthsAgo() {
        const today = new Date();
        const sixMonthsAgo = new Date(today);

        // Subtract 6 months
        sixMonthsAgo.setMonth(today.getMonth() - 3);

        // Format the date
        const year = sixMonthsAgo.getFullYear();
        const month = String(sixMonthsAgo.getMonth() + 1).padStart(2, '0');
        const day = String(sixMonthsAgo.getDate()).padStart(2, '0');
        const hours = String(sixMonthsAgo.getHours()).padStart(2, '0');
        const minutes = String(sixMonthsAgo.getMinutes()).padStart(2, '0');
        const seconds = String(sixMonthsAgo.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    const tickets = await fetchFromAdOrbit(ticketRoute, "GET",
        {
            'X-OPT-CHANGEDSINCE': getSixMonthsAgo()
        }
    )

/*
    if we have to fetch the issue id I think we'd have to do all this:
    const oneticketRoute: string = routes["ad-ticket"];
    const adRoute: string = routes["print-ad-item"];


    const ticket = await fetchFromAdOrbit(oneticketRoute.replace("{id}", "16267"), "GET");

    const ad = await fetchFromAdOrbit(adRoute.replace("{id}", ticket.ad_id), "GET");*/

    const activeTickets = tickets.filter((ticket: { [x: string]: string; }) => ticket['status_name'] !== 'Done');


    return Response.json(activeTickets);
}
