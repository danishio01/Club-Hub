import Razorpay from 'razorpay';
import crypto from 'crypto';
import Event from '../models/eventModel.js';

export const createRazorpayOrder = async (req, res) => {
    try {
        const { eventId } = req.body;
        const event = await Event.findById(eventId);

        if (!event || event.eventType === 'Free') {
            return res.status(400).json({ success: false, message: 'Invalid event for payment' });
        }

        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: event.price * 100, 
            currency: "INR",
            receipt: `receipt_order_${eventId}`,
        };

        const order = await instance.orders.create(options);
        
        return res.status(200).json({ 
            success: true, 
            data: { ...order, key_id: process.env.RAZORPAY_KEY_ID } 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            return res.status(200).json({ success: true, message: "Payment verified successfully" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid signature sent!" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};