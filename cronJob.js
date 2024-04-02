const cron = require('cron');
const { databaseService } = require('./service');
const { sendMessagesToTelegram } = require('./index');

// Tạo một cron job chạy vào 22h mỗi ngày để gửi các transaction nằm trong transactionUnsent
const sendUnsentTransactionJob = new cron.CronJob('0 22 * * *', async () => {
  try {
    const unsentTransactions = await databaseService.transactionUnsent.find().toArray();
    if (unsentTransactions.length > 0) {
      for (const transaction of unsentTransactions) {
        // Gửi transaction
        await sendMessagesToTelegram(transaction);
      }
    } else {
      console.log('No unsent transactions found.');
    }
  } catch (error) {
    console.log('Error sending unsent transactions:', error);
  }
});

// Tạo một cron job chạy vào 00h00 mỗi ngày để xóa toàn bộ dữ liệu trong transactionSent sau 3 ngày
const deleteOldDataJob = new cron.CronJob('0 0 * * *', async () => {
  try {
    // Tính toán ngày 3 ngày trước đây
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Xóa dữ liệu trong transactionSent lớn hơn hoặc bằng 3 ngày trước
    await databaseService.transactionSent.deleteMany({ createdAt: { $lte: threeDaysAgo } });
    console.log('Old data in transactionSent deleted successfully.');
  } catch (error) {
    console.log('Error deleting old data:', error);
  }
});
exports.sendUnsentTransactionJob = sendUnsentTransactionJob;
exports.deleteOldDataJob = deleteOldDataJob;