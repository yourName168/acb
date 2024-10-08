const sendUnsentTransactionJob = require("./cronJob").sendUnsentTransactionJob;
const deleteOldDataJob = require("./cronJob").deleteOldDataJob;
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const ACB = require("./acb");
const { databaseService } = require("./service");
const app = express();
databaseService.connect();
const acb = new ACB();
let accessToken = null;

try {
  sendUnsentTransactionJob.start();
  deleteOldDataJob.start();
} catch (error) {
  console.log("Error starting cron jobs:", error);
}

const formatMessage = (data, sodu) => {
  const sodu1 = sodu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const transactionNumber = data.transactionNumber;
  const amount = data.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const description = data.description;
  const type = data.type === "IN" ? "+" : "-";
  return `Giao dịch : ${type} ${amount} VND
Số dư : ${sodu1} VND
Nội dung : ${description}
Mã giao dịch : ${transactionNumber}`;
};

const loginToACB = async (username, password) => {
  try {
    const result = await acb.login(username, password);
    return result.accessToken;
  } catch (error) {
    console.log("Failed to login to ACB:", error);
    throw new Error("Failed to login to ACB.");
  }
};

const fetchTransactions = async (numberAccount, username, password) => {
  let accessToken;
  try {
    accessToken = await loginToACB(username, password);
    const result = await acb.lsgd(numberAccount,5, accessToken);
    return [result.data, accessToken];
  } catch (e) {
    try{
      accessToken = await loginToACB(username, password);
      const result = await acb.lsgd(numberAccount,5, accessToken);
      return [result.data, accessToken];
    }
    catch(e){
      console.log("Failed to fetch transactions:", e);
      throw new Error("Failed to fetch transactions.");
    }
  }
};

const sendMessagesToTelegram = async (
  bot,
  listChatId,
  transaction,
  accessToken
) => {
  try {
    const sodu = (await acb.getsodu(accessToken)).data[0].totalBalance;
    const message = formatMessage(transaction, sodu);
    const sendMessagePromises = listChatId.map((chatId) => {
      return bot.sendMessage(chatId, message);
    });

    // Chờ tất cả các tin nhắn được gửi xong
    await Promise.all(sendMessagePromises);

    console.log(transaction.transactionNumber);

    // Ghi nhận giao dịch đã gửi thành công vào cơ sở dữ liệu
    // await databaseService.transactionSent.insertOne({
    //   transactionCode: `${transaction.transactionNumber}-${transaction.account}`,
    // });

    console.log("Message sent successfully");
  } catch (error) {
    // Ghi nhận giao dịch không thể gửi vào cơ sở dữ liệu
    await databaseService.transactionUnsent.insertOne({ transaction });

    console.log("Error sending messages to Telegram:", error);
  }
};

const handleTransactions = async (
  numberAccount,
  bot,
  listChatId,
  username,
  password
) => {
  // bot.sendMessage(chatId, "handleTransactions started");
  try {
    const [transactions, accessToken] = await fetchTransactions(
      numberAccount,
      username,
      password
    );
    for (const transaction of transactions) {
      const result = await databaseService.transactionSent.findOne({
        transactionCode: `${transaction.transactionNumber}-${transaction.account}`
      });
      console.log(result);
      if (!result) {
        await sendMessagesToTelegram(bot, listChatId, transaction, accessToken);
      }
      else {
        break;
      }
    }
  } catch (error) {
    console.log("Error handling transactions:", error);
  }
};

const startBot = async (
  numberAccount,
  botToken,
  listChatId,
  username,
  password
) => {
  const bot = new TelegramBot(botToken, { polling: true });

  while (true) {
    try {
      await handleTransactions(
        numberAccount,
        bot,
        listChatId,
        username,
        password
      );
      // bot.stopPolling();
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.log("Error starting bot:", error);
    }
  }
};

const port = process.env.PORT || 4000;
app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  await Promise.all([
    startBot(
      "40887567",
      "7484166601:AAHIRMO6YPYSRUMvfOtRk4Kmg_IMVl62YvM",
      ["6449260356", "-4213276568"],
      "hagiang6868",
      "Giang2003@"
    )
  ]);
});

module.exports = { sendMessagesToTelegram };
