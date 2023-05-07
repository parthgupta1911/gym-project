const nodemailer = require(`nodemailer`);

module.exports = async (options) => {
  var transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: "admin@gymproj.io",
    to: options.to,
    subject: options.subject,
    text: options.text,
  };
  await transporter.sendMail(mailOptions);
};
