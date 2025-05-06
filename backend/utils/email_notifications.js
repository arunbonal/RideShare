const axios = require("axios");

exports.sendEmailNotification = async ({message, email}) => {
    const payload = {message, email};

    axios.post("https://rideshare.app.n8n.cloud/webhook/notification-email", payload)
        .then(() => {console.log(`${message} sent to ${email} successfully`)})
        .catch((err) => {console.log(err)});
}