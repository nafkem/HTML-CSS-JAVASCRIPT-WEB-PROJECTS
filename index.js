require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const UssdMenu = require("ussd-builder");

const mongoString = process.env.DATABASE_URL;
mongoose.connect(mongoString);
const database = mongoose.connection;

database.on("error", (error) => {
    console.log(error);
});

database.once("connected", () => {
    console.log("Database connected...");
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let menu = new UssdMenu();
menu.startState({run: () =>
    {
        // use menu.con() to send response without terminating session
        menu.con('Welcome! Please select your language' +
        '\n1. English' +
        '\n2. Yoruba' + 
        '\n3. Massai', +
        '\n4. quit');
    },
    // next object links to next state based on user input
    next: {
        '1': 'english',
        '2': 'yoruba',
        '3': 'massai',
        '4': 'quit'
    }}
);

menu.state('english', {
    run: () => {
        menu.con('You have selected English.Before we go ahead, whats your name?');
    },
    next: {
        '*[a-zA-Z]+': 'english.tickets'
    }}
);

menu.state('english.tickets', {
    run: () => {
        let name = menu.val;
        dataToSave.name = name;
        const atCredentials = {
            apiKey: process.env.AT_SANDBOX_APIKEY,
            username: process.env.AT_SANDBOX_USERNAME
        };
        const AfricasTalking = require("africastalking")(atCredentials)
        const sms = AfricasTalking.SMS;
        console.log(dataToSave);
        menu.con('How many tickets would you like to reserve?');
    },
    next: {
        // using regex to match user input to next state
        '*\\d+': 'end'
    }
});

//Add for yoruba
// menu.state('english', {
//     run: () => {
//         menu.con('You have selected English.Before we go ahead, whats your name?');
//     },
//     next: {
//         '*[a-zA-Z]+': 'english.tickets'
//     }}
// );

// menu.state('english.tickets', {
//     run: () => {
//         let name = menu.val;
//         dataToSave.name = name;
//         const atCredentials = {
//             apiKey: process.env.AT_SANDBOX_APIKEY,
//             username: process.env.AT_SANDBOX_USERNAME
//         };
//         const AfricasTalking = require("africastalking")(atCredentials)
//         const sms = AfricasTalking.SMS;
//         console.log(dataToSave);
//         menu.con('How many tickets would you like to reserve?');
//     },
//     next: {
//         // using regex to match user input to next state
//         '*\\d+': 'end'
//     }
// });


menu.state('end', {
    run: async () => {
        let tickets = menu.val;
        dataToSave.tickets = tickets;
        console.log(dataToSave);
        // Save the data
        const data = new Model({
            name: dataToSave.name,
            tickets: dataToSave.tickets
        });

        const dataSaved = await data.save();
        const options = {
            to: menu.args.phoneNumber,
            message: `Hi ${dataToSave.name}, we've reserved ${dataToSave.tickets} tickets for you.`
        }
        await sms.send(options);

        //const dataSaved = await data.save();
        menu.end('Awesome! We have your tickets reserved. Sending a confirmation text shortly.');
    }
});

menu.state('quit', {
    run: () => {
        menu.end("Goodbye :)");
    }
});

// Registering USSD handler with Express
app.post('/', (req, res)=>{
    menu.run(req.body, ussdResult => {
        res.send(ussdResult);
    });
});
app.listen(3000, () => {
    console.log("What's popping? We're connected");
});