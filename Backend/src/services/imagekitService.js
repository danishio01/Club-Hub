import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config();

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

export const uploadBannerToImageKit = async (bufferOrBase64, filename) => {
    try {
        const fileData = Buffer.isBuffer(bufferOrBase64) 
            ? bufferOrBase64.toString('base64') 
            : bufferOrBase64.replace(/^data:image\/\w+;base64,/, "");

        const response = await imagekit.upload({
            file: fileData,
            fileName: `${filename}_${Date.now()}.png`,
            folder: "/ClubHub/Banners/"
        });
        return { url: response.url, fileId: response.fileId };
    } catch (error) {
        throw error;
    }
};

export const deleteBannerFromImageKit = async (fileId) => {
    try {
        await imagekit.deleteFile(fileId);
        return true;
    } catch (error) {
        throw error;
    }
};