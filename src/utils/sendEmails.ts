import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, text: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"Smart_collge" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });

  return info;
};

// import SibApiV3Sdk from "sib-api-v3-sdk";

// // إعداد Brevo API
// const client = SibApiV3Sdk.ApiClient.instance;
// client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY!;

// const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// // دالة لإرسال الإيميل
// export const sendEmail = async (to: string, subject: string, text: string) => {
//   try {
//     await apiInstance.sendTransacEmail({
//       sender: { email: process.env.BREVO_SENDER_EMAIL!, name: "Smart College" },
//       to: [{ email: to }],
//       subject,
//       textContent: text,
//     });
//     console.log("✅ Email sent via Brevo API");
//   } catch (error) {
//     console.error("❌ Email error:", error);
//   }
// };
