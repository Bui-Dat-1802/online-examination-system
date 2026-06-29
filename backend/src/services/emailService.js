const nodemailer = require("nodemailer");

const friendlyEmailError = () => {
  const err = new Error("Không thể gửi OTP. Vui lòng thử lại sau.");
  err.status = 500;
  return err;
};

const getEmailConfig = () => {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s/g, "");

  if (!user || !pass) {
    console.error("Email config missing:", {
      EMAIL_USER: Boolean(user),
      EMAIL_PASS: Boolean(pass),
    });
    throw friendlyEmailError();
  }

  return { user, pass };
};

const sendResetOtpEmail = async (toEmail, otp, message) => {
  const { user, pass } = getEmailConfig();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Support" <${user}>`,
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
  } catch (error) {
    console.error("Email send failed:", error.message);
    throw friendlyEmailError();
  }
};

module.exports = {
  sendResetOtpEmail,
};
