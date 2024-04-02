const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const ACB = require("./acb");
const { databaseService } = require("./service");

const app = express();
databaseService.connect();

const username = "bin7979";
const password = "Lam@3979#";
const botToken = "7137690710:AAF5w-cO_y9rtPUYcz9dBdLFdT_fMDcNzBc"; // Replace with your bot token

const acb = new ACB();
const bot = new TelegramBot(botToken, { polling: true });

const messageSendToTelegram = (data, sodu) => {
  const sodu1 = sodu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const transactionNumber = data.transactionNumber;
  const amount = data.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const description = data.description;
  const account = data.account;
  const bankName = "ACB";
  const type = data.type === "IN" ? "+" : "-";
  return `Số dư tài khoản vừa ${type} ${amount} VND
      Số dư tài khoản:${sodu1}
      Mô tả -> ${description}
      Mã giao dịch: ${transactionNumber}
      Số tài khoản: ${account} 
      Ngân hàng: ${bankName}
      `;
};

const loginToACB = async (username, password) => {
  try {
    const result = await acb.login(username, password);
    return result.accessToken;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to login to ACB.");
  }
};

const getLSGD = async (username, password) => {
  try {
    const accessToken = await loginToACB(username, password);
    const sodu = (await acb.getsodu(accessToken)).data[0].totalBalance;
    const result = await acb.lsgd("6559411", 5, accessToken);
    return [result.data, sodu];
  } catch (error) {
    console.log(error);
    throw new Error("Failed to retrieve transaction history.");
  }
};

const getTransferAndSendToTelegram = async (
  chatId,
  bot,
  username,
  password
) => {
  try {
    const LSGD = await getLSGD(username, password);
    const data = LSGD[0];
    const sodu = LSGD[1];
    data.map(async (transaction) => {
      const check = await databaseService.transactionSent.findOne({
        transactionNumber: transaction.transactionNumber,
      });
      if (!check) {
        const message = messageSendToTelegram(transaction, sodu);
        bot
          .sendMessage(chatId, message)
          .then(async () => {
            await databaseService.transactionSent.insertOne({
              transactionNumber: transaction.transactionNumber,
            });
            console.log("message sent");
          })
          .catch(async (error) => {
            await databaseService.transactionUnsent.insertOne({
              transaction,
            });
            console.log("Error sending message:", error);
          });
      }
    });
  } catch (error) {
    console.log(error);
  }
};

const CreateBot = () => {
  try {
    console.log("server is running");
    getTransferAndSendToTelegram("6449260356", bot, username, password);
  } catch (error) {
    console.log("error server");
  }
};

setInterval(CreateBot, 1000);
const port = 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
