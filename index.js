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
const botToken = "7137690710:AAF5w-cO_y9rtPUYcz9dBdLFdT_fMDcNzBc";
const chatId = "6449260356";
try {
  sendUnsentTransactionJob.start();
  deleteOldDataJob.start();
} catch (error) {
  console.log("Error starting cron jobs:", error);
}
const bot = new TelegramBot(botToken, { polling: true });
bot.sendMessage(chatId, "Bot started");
const formatMessage = (data, sodu) => {
  const sodu1 = sodu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const transactionNumber = data.transactionNumber;
  const amount = data.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const description = data.description;
  const account = data.account;
  const bankName = "ACB";
  const type = data.type === "IN" ? "+" : "-";
  return `
          Giao dịch ${type} ${amount} VND
          Số dư: ${sodu1}
          Nội dung: ${description}
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
    console.log("Failed to login to ACB:", error);
    throw new Error("Failed to login to ACB.");
  }
};

const fetchTransactions = async (username, password) => {
  try {
    const accessToken = await loginToACB(username, password);
    const sodu = (await acb.getsodu(accessToken)).data[0].totalBalance;
    const result = await acb.lsgd("6559411", 10, accessToken);
    return [result.data, sodu];
  } catch (error) {
    console.log("Failed to retrieve transaction history:", error);
    throw new Error("Failed to retrieve transaction history.");
  }
};

const sendMessagesToTelegram = async (transaction, sodu) => {
  try {
    const message = formatMessage(transaction, sodu);
    await bot.sendMessage(chatId, message);
    console.log(transaction.transactionNumber);
    await databaseService.transactionSent.insertOne({
      transactionNumber: transaction.transactionNumber,
    });
    console.log("Message sent successfully");
  } catch (error) {
    await databaseService.transactionUnsent.insertOne({ transaction });
    console.log("Error sending messages to Telegram:", error);
  }
};

const handleTransactions = async () => {
  try {
    const [transactions, sodu] = await fetchTransactions(
      "bin7979",
      "Lam@3979#"
    );
    for (const transaction of transactions) {
      const result = await databaseService.transactionSent.findOne({
        transactionNumber: transaction.transactionNumber,
      });
      console.log(result);
      if (!result) {
        await sendMessagesToTelegram(transaction, sodu);
      }
    }
  } catch (error) {
    console.log("Error handling transactions:", error);
  }
};

const startBot = async () => {
  while (true) {
    try {
      await handleTransactions();
      await new Promise((resolve) => setTimeout(resolve, 4000));
    } catch (error) {
      console.log("Error starting bot:", error);
    }
  }
};

const port = process.env.PORT || 4000;
app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  await startBot();
});

exports.sendMessagesToTelegram = sendMessagesToTelegram;
