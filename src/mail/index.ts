// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
import sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "")

console.log("mailservice created");

export const sendMail = async () => {

  const msg = {
    to: 'marsluka@gmx.de', // Change to your recipient
    from: 'noreply@pwahub.one', // Change to your verified sender
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
  }

  sgMail.send(msg)
  .then(() => {
      console.log('Email sent')
  })
  .catch((error) => {
    console.error(error)
  })
}