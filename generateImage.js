import axios from 'axios';
import cloudinary from './cloudinary.js'; // Import the configured cloudinary instance

export const generateImage = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;

        if (plan !== 'premium') {        
            return res.json({ 
                success: false, 
                message: 'This feature is only available for premium users. Upgrade to continue.' 
            });
        }

        const formData = new FormData();
        formData.append('prompt', prompt);
        
        const { data } = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
            headers: { 'x-api-key': process.env.CLIP_DROP_API_KEY },
            responseType: "arraybuffer"
        });

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

        await new Promise(resolve => setTimeout(resolve, 100));
 
        // Upload to Cloudinary using the configured instance
        const uploadResult = await cloudinary.uploader.upload(base64Image, {
            resource_type: "image",
            folder: "ai-generated-images", // Optional: organize uploads in folders
            public_id: `image_${userId}_${Date.now()}`, // Optional: custom public ID
        });

        // Storing the data in database:
        await sql`INSERT INTO creations(user_id, prompt, content, type, publish)
                  VALUES(${userId}, ${prompt}, ${uploadResult.secure_url}, 'image', ${publish ?? false})`;

        // Sending the response
        res.json({ 
            success: true, 
            content: uploadResult.secure_url 
        });

    } catch (error) {
        console.log('Error in generateImage:', error.message);
        res.json({ 
            success: false, 
            message: error.message 
        });
    }
};