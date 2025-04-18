const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const subscribers = [];

function requestPayment(phoneNumber, amount) {
  const referenceId = uuidv4();
  return axios.post('https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay',
    {
      amount: amount.toString(),
      currency: "EUR",
      externalId: referenceId,
      payer: {
        partyIdType: "MSISDN",
        partyId: phoneNumber
      },
      payerMessage: "Monthly Subscription",
      payeeNote: "Thank you for your payment"
    },
    {
      headers: {
        "X-Reference-Id": referenceId,
        "X-Target-Environment": "sandbox",
        "Ocp-Apim-Subscription-Key": "REPLACE_WITH_YOUR_KEY",
        "Authorization": "Bearer REPLACE_WITH_ACCESS_TOKEN",
        "Content-Type": "application/json"
      }
    }).then(() => true).catch(() => false);
}

app.post('/api/subscribe', (req, res) => {
  const { name, phone, plan } = req.body;
  subscribers.push({ id: uuidv4(), name, phone, planAmount: plan });
  res.json({ message: 'Subscription saved. Payment will be attempted soon.' });
});

cron.schedule('0 8 * * *', async () => {
  for (const user of subscribers) {
    const success = await requestPayment(user.phone, user.planAmount);
    fs.appendFileSync("transactions.log", `User: ${user.name}, Success: ${success}\n`);
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));