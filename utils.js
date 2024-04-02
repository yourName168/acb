const bcrypt = require('bcrypt');

// Salt cố định (bạn có thể thay đổi giá trị này nếu cần)
const fixedSalt = '$2b$10$ThisIsAFixedSaltForHashing';

const hashPassWord = (passWord) => {
  // Sử dụng salt cố định để băm mật khẩu
  return bcrypt.hashSync(passWord, fixedSalt);
};

module.exports = hashPassWord;
