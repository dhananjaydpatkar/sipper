import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

export const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

// Initialize the WhatsApp client
export const initializeWhatsApp = () => {
    // Event: QR Code received
    whatsappClient.on('qr', (qr) => {
        console.log('\n=========================================');
        console.log('📱 WhatsApp Login Required!');
        console.log('Please scan this QR code with your WhatsApp app to link your account for sending OTPs:');
        qrcode.generate(qr, { small: true });
        console.log('=========================================\n');
    });

    // Event: Authenticated successfully
    whatsappClient.on('authenticated', () => {
        console.log('✅ WhatsApp authenticated successfully!');
    });

    // Event: Client is ready to send messages
    whatsappClient.on('ready', () => {
        console.log('✅ WhatsApp Client is ready! Now you can send OTPs.');
        isReady = true;
    });

    // Event: Client disconnected
    whatsappClient.on('disconnected', (reason) => {
        console.log('❌ WhatsApp Client was logged out or disconnected:', reason);
        isReady = false;
    });

    whatsappClient.initialize();
};

export const sendWhatsAppOTP = async (phoneNumber: string, otp: string) => {
    // ALWAYS log the OTP to the console so it's visible for local testing
    console.log(`\n=========================================`);
    console.log(`[OTP LOG] Your OTP for ${phoneNumber} is: ${otp}`);
    console.log(`=========================================\n`);

    if (!isReady) {
        console.warn('⚠️ WhatsApp client is not ready. OTP will only be visible in logs.');
        return true;
    }

    try {
        const message = `Your Sipper OTP is: ${otp}. Please do not share this with anyone.`;
        // WhatsApp IDs are formatted as country_code + phone_number + "@c.us"
        const formattedNumber = phoneNumber.replace('+', '') + '@c.us';
        await whatsappClient.sendMessage(formattedNumber, message);
        console.log(`[WhatsApp] Sent OTP to ${phoneNumber}`);
        return true;
    } catch (error) {
        console.error(`[WhatsApp] Failed to send OTP to ${phoneNumber}:`, error);
        return false;
    }
};
