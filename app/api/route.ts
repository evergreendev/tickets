import {NextRequest} from "next/server";
import axios from 'axios';
import CryptoJS from 'crypto-js';
import {hash} from "node:crypto";

export async function GET(req: NextRequest){

// Configuration
    const API_BASE_URL = process.env.API_BASE_URL || 'https://api.adorbit.com';
    const API_KEY = process.env.API_KEY;
    const API_PUB = process.env.PUBLIC_KEY;

// Check if API key is provided
    if (!API_KEY) {
        console.error('Error: API_KEY is required. Please set it in your .env file.');
        process.exit(1);
    }
    const routeMsg = "GET\n"+API_BASE_URL+"/";


    var routeHash   = CryptoJS.HmacSHA512(routeMsg, API_KEY);
    var routeCrypt  = CryptoJS.enc.Utf8.parse(routeHash.toString());
    var routeBase64 = CryptoJS.enc.Base64.stringify(routeCrypt);

    const routes = await axios.get(API_BASE_URL,{
        headers: {
            'Authorization': "ADORBIT " +API_PUB+":"+routeBase64,
            'Accept': 'application/json',
        }
    });

    const ticketRoute:string = routes.data.tickets;



    const ticketMsg = "GET\n"+ticketRoute;


    const ticketHash = CryptoJS.HmacSHA512(ticketMsg, API_KEY);
    const crypt = CryptoJS.enc.Utf8.parse(ticketHash.toString());
    const base64 = CryptoJS.enc.Base64.stringify(crypt);

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

    const ticketRes = await axios.get(ticketRoute, {
        headers: {
            'Authorization': "ADORBIT " +API_PUB+":"+base64,
            'Accept': 'application/json',
            'X-OPT-CHANGEDSINCE': getSixMonthsAgo()
        }
    })

    const tickets = ticketRes.data;

    const activeTickets = tickets.filter((ticket: { [x: string]: string; }) => ticket['status_name'] !== 'Done');


    return new Response(activeTickets);
}
