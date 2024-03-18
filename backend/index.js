const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const multer = require("multer");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const catchAsyncErrors = require("./catchAsyncErrors");
const cors = require("cors");
const connectDatabase = require("./Database/database");
const PORT = 3001;
const Shop = require("./model/shop");
const xlsx = require("xlsx");
const Subscriber = require("./model/subscribers");

let qrCodeData;
let success = false;

// const client = new Client({ authStrategy: new LocalAuth() });
const client = new Client();

client.on("qr", (qr) => {
  qrCodeData = qr;
  console.log("Scan the QR code to log in:", qr);
  success = false;
});

client.on("ready", () => {
  console.log("WhatsApp Client is ready.");
  success = true;
});

client
  .initialize()
  .then(() => {
    console.log("WhatsApp Client initialized successfully.");
  })
  .catch((error) => {
    console.error("Error initializing WhatsApp Client:", error);
  });

// const shopPhoneNumber = 254726327352;
// const shopName = "craaaaig";

// async function sendOrderNotification(shopPhoneNumber, shopName) {
//   const message = `Hello ${shopName}, You have a new order Order Number: click on these link below to check\nhttps://ninetyone.co.ke/dashboard-orders`;

//   try {
//     console.log("Attempting to send message to:", `${shopPhoneNumber}@c.us`);
//     await client.sendMessage(`${shopPhoneNumber}@c.us`, message);
//     console.log("Order notification sent successfully.");
//   } catch (error) {
//     console.error("Error sending order notification:", error);
//   }
// }

connectDatabase();
app.use(
  cors({
    origin: [
      "https://www.ninetyone.co.ke",
      "https://ninetyone.co.ke",
      "http://localhost:3000",
    ], //this one
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Access-Control-Allow-Credentials",
      "Access-Control-Allow-Origin",
    ],
    credentials: true, // email data change
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + ".jpg");
  },
});

const upload = multer({ storage: storage });
// send via whatsapp group (lass)

// app.post("/send-ads", upload.single("image"), async (req, res) => {
//   try {
//     const { name } = req.body;
//     const imagePath = req.file.path;
//     const advertisementMessage = `${name}`;

//     const workbook = xlsx.readFile("./uploads/book1.xlsx");
//     // Assuming your sheet name is 'Sheet1'
//     const sheet = workbook.Sheets["Sheet1"];
//     // Convert the sheet data to JSON
//     const subscribersObject = xlsx.utils.sheet_to_json(sheet);

//     // Extract only the keys (phone numbers) from the nested structure
//     const phoneNumbers = Object.values(subscribersObject).map(
//       (nestedObj) => Object.values(nestedObj)[0]
//     );

//     for (const phoneNumber of phoneNumbers) {
//       console.log("Original phone number:", phoneNumber);

//       // Create a new Subscriber instance with the provided phone number
//       const newSubscriberData = {
//         number: phoneNumber.replace(/\D/g, ""), // Remove non-numeric characters
//         email: `91NUL${phoneNumber.replace(/\D/g, "")}`, // Remove non-numeric characters
//       };

//       // Save the new subscriber to the database
//       const newSubscriber = new Subscriber(newSubscriberData);
//       await newSubscriber.save();

//       console.log("New subscriber saved:", newSubscriberData);
//     }

//     // Proceed to send advertisements as needed

//     res.status(200).json({ message: "Ads sent successfully" });
//     console.log("ad");
//   } catch (error) {
//     // Handle errors
//     console.error("Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// announcements to subscribers via whatsapp
app.post("/send-ads", upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;
    const imagePath = req.file.path;
    const advertisementMessage = `${name}`;

    // Fetch all subscribers from the database
    const subscribers = await Subscriber.find()
      .sort({ dateSubscribed: -1 })
      .skip(40)
      .limit(180);

    for (const subscriber of subscribers) {
      // Ensure that the subscriber object has the 'number' property
      if (subscriber && subscriber.number) {
        let { number } = subscriber;

        // Check if the number does not start with "91NUL"
        if (!number.startsWith("91NUL")) {
          // Convert the number to the international format "254"
          number = number.startsWith("0") ? `254${number.slice(1)}` : number;

          try {
            const media = MessageMedia.fromFilePath(imagePath);
            const caption = advertisementMessage;
            const chatId = `${number}@c.us`;

            // Send the advertisement to the subscriber
            await client.sendMessage(chatId, media, { caption });
            console.log("Advertisement sent successfully to:", number);
          } catch (error) {
            console.error("Error sending media:", error);
            // Handle error for individual subscriber, but continue with the loop
          }
        }
      } else {
        console.error(
          "Subscriber object is missing 'number' property:",
          subscriber
        );
        // Handle this case as needed
      }
    }

    res.status(200).json({ message: "Ads sent successfully" });
    console.log("ad");
  } catch (error) {
    // Handle errors
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// announcements to sellers via whatsapp
app.post(
  "/send-messages",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { message } = req.body;

      console.log("message", message);

      // Fetch all shops from the database
      const shops = await Shop.find().sort({
        createdAt: -1,
      });

      for (const shop of shops) {
        let { name, phoneNumber } = shop;

        // Check if the phoneNumber starts with "07"
        if (phoneNumber.startsWith("07")) {
          // If true, add "254" at the beginning to convert it to the Kenyan format
          phoneNumber = "254" + phoneNumber.slice(1);
        }

        // await client.sendMessage(
        //   `${phoneNumber}@c.us`,
        //   `Hello ${name}, ${message}`
        // );
        await client.sendMessage(
          "254741895028@c.us",
          `Hello There, ${message}`
        );

        console.log("SMS sent successfully to:", phoneNumber);
      }

      res
        .status(200)
        .json({ success: true, message: "Messages sent successfully" });
    } catch (error) {
      console.error(error);
      return next((error.message, 500));
    }
  })
);

// Whatsapp Chatbot
// whatsapp order notification
app.post(
  "/sendmyorder",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const {
        cart,
        shippingAddress,
        user,
        totalPrice,
        paymentInfo,
        shippingPrice,
        discount,
      } = req.body;

      const shopItemsMap = new Map();
      const shopEmailsMap = new Map();
      const order = req.body;

      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);

        if (!shopEmailsMap.has(shopId)) {
          const shop = await Shop.findById(shopId);
          if (shop) {
            shopEmailsMap.set(shopId, shop.email);
          }
        }
      }

      for (const [shopId, items] of shopItemsMap) {
        try {
          const shop = await Shop.findById(shopId);

          if (shop) {
            const shopEmail = shop.email;
            let shopPhoneNumber = shop.phoneNumber || 254726327352;
            const shopName = shop.name || craig;

            // Check if the phone number starts with "07" and replace it with "2547"
            if (shopPhoneNumber.startsWith("07")) {
              shopPhoneNumber = "2547" + shopPhoneNumber.slice(2);
            }

            console.log("Sending SMS to:", shopPhoneNumber);
            console.log("this is", shopName);

            // Sending WhatsApp message
            await client.sendMessage(
              `${shopPhoneNumber}@c.us`,
              `Hello ${shopName}, You have a new order Order Number:${order.orderNo} click on these link below to check
               https://ninetyone.co.ke/dashboard-orders`
            );

            console.log("SMS sent successfully to:", shopPhoneNumber);
          }
        } catch (error) {
          console.error(
            `Error fetching shop details for shopId ${shopId}: ${error}`
          );
        }
      }

      res.status(201).json({
        success: true,
      });
    } catch (error) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

app.get("/qr", function (req, res) {
  res.send("<h1>qrCodeData</h1>");
});

app.get("/sucess", function (req, res) {
  res.send(success);
});

app.get("/", function (req, res) {
  res.send("<h1>hello</h1>");
});

app.listen(3001, () => {
  console.log("Server is running on port");
});
