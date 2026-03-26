const nodemailer = require("nodemailer");

const sendResetOtpEmail = async (toEmail, otp, message) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: message,
    html: `
      <h2>${message}</h2>
      <p>Mã xác nhận của bạn là:</p>
      <h1 style="color:red; letter-spacing: 2px;">${otp}</h1>
      <p>Mã có hiệu lực trong <b>5 phút</b>.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
    `,
  });
};


module.exports = {
  sendResetOtpEmail,
};
