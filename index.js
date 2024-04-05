// const express = require("express");
// const TelegramBot = require("node-telegram-bot-api");
// const ACB = require("./acb");
// const { databaseService } = require("./service");
// const app = express();
// databaseService.connect();
// const acb = new ACB();
// const botToken = "7031591905:AAH10dqivszC6fAsD8zhnREkrxC71g5nEKg";
// const chatId = "6944161883";

// const bot = new TelegramBot(botToken, { polling: true });
// bot.sendMessage(chatId, "Bot started");
// const formatMessage = (data, sodu) => {
//   const sodu1 = sodu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//   const transactionNumber = data.transactionNumber;
//   const amount = data.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//   const description = data.description;
//   const account = data.account;
//   const bankName = "ACB";
//   const type = data.type === "IN" ? "+" : "-";
//   return `
//           Giao dịch ${type} ${amount} VND
//           Số dư:${sodu1}
//           Nội dung: ${description}
//           Mã giao dịch: ${transactionNumber}
//           Số tài khoản: ${account}
//           Ngân hàng: ${bankName}
//       `;
// };

// const loginToACB = async (username, password) => {
//   try {
//     const result = await acb.login(username, password);
//     return result.accessToken;
//   } catch (error) {
//     console.log("Failed to login to ACB:", error);
//     throw new Error("Failed to login to ACB.");
//   }
// };

// const fetchTransactions = async (username, password) => {
//   try {
//     const accessToken = await loginToACB(username, password);
//     const sodu = (await acb.getsodu(accessToken)).data[0].totalBalance;
//     const result = await acb.lsgd("6559411", 100, accessToken);
//     return [result.data, sodu];
//   } catch (error) {
//     console.log("Failed to retrieve transaction history:", error);
//     throw new Error("Failed to retrieve transaction history.");
//   }
// };

// const sendMessagesToTelegram = async (transaction, sodu) => {
//   try {
//     const message = formatMessage(transaction, sodu);
//     await bot
//       .sendMessage(chatId, message)
//       .then(async () => {
//         console.log(transaction.transactionNumber);
//         await databaseService.transactionSent.insertOne({
//           transactionNumber: transaction.transactionNumber,
//         });
//         console.log("Message sent successfully");
//       })
//       .catch(async (error) => {
//         await databaseService.transactionUnsent.insertOne({ transaction });
//       });
//   } catch (error) {
//     console.log("Error sending messages to Telegram:", error);
//   }
// };

// const handleTransactions = async () => {
//   try {
//     const [transactions, sodu] = await fetchTransactions(
//       "bin7979",
//       "Lam@3979#"
//     );
//     await transactions.forEach(async (transaction) => {
//       const result = await databaseService.transactionSent.findOne({
//         transactionNumber: transaction.transactionNumber,
//       });
//       console.log(result);
//       if (!result) {
//         await sendMessagesToTelegram(transaction, sodu);
//       }
//     });
//   } catch (error) {
//     console.log("Error handling transactions:", error);
//   }
// };

// const startBot = async () => {
//   try {
//     setInterval(handleTransactions, 10000); // Default poll interval: 3 seconds
//   } catch (error) {
//     console.log("Error starting bot:", error);
//   }
// };

// const port = process.env.PORT || 4000;
// app.listen(port, async () => {
//   console.log(`Server is running on port ${port}`);
//   await startBot();
// });
const sendUnsentTransactionJob = require("./cronJob").sendUnsentTransactionJob;
const deleteOldDataJob = require("./cronJob").deleteOldDataJob;
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const ACB = require("./acb");
const { databaseService } = require("./service");
const app = express();
databaseService.connect();
const acb = new ACB();

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
  try {
    const accessToken = await loginToACB(username, password);
    const result = await acb.lsgd(numberAccount, 5, accessToken);
    return [result.data, accessToken];
  } catch (error) {
    console.log("Failed to retrieve transaction history:", error);
    throw new Error("Failed to retrieve transaction history.");
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
    await databaseService.transactionSent.insertOne({
      transactionNumber: transaction.transactionNumber,
    });

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
        transactionNumber: transaction.transactionNumber,
      });
      console.log(result);
      if (!result) {
        await sendMessagesToTelegram(bot, listChatId, transaction, accessToken);
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
      await new Promise((resolve) => setTimeout(resolve, 3000));
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
      "7850491",
      "6820544893:AAH1D8M58VyK6bVrJc28XQwcoVZTBn-FemI",
      ["6449260356", "-4191168997"],
      "meomeo1999",
      "Thang@1999#"
    ),
    startBot(
      "6559411",
      "7137690710:AAF5w-cO_y9rtPUYcz9dBdLFdT_fMDcNzBc",
      ["6449260356", "-4189985331"],
      "bin7979",
      "Lam@3979#"
    ),
  ]);
});

module.exports = { sendMessagesToTelegram };
