
require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;

// OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Frontend connection
app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ]
}));

app.use(express.json());

// Image upload configuration
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new Error("Only JPG, PNG and WEBP images are allowed."));
        }
    }
});

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Wardrobe AI Backend is running!"
    });
});

// AI clothing detection route
app.post("/api/analyze-clothing", upload.single("image"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a clothing image."
            });
        }

        const base64Image = req.file.buffer.toString("base64");

        const imageData = `data:${req.file.mimetype};base64,${base64Image}`;

        const response = await openai.responses.create({

            model: "gpt-4.1-mini",

            input: [
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: `
                            Analyse this clothing image.

                            Identify:
                            1. Category: Tops, Bottoms, Shoes, Accessories or Other.
                            2. Clothing type.
                            3. Main colour.
                            4. Pattern: Plain, Striped, Printed, Checked or Other.
                            5. Short description.

                            Return ONLY valid JSON in this format:

                            {
                                "category": "Tops",
                                "type": "T-Shirt",
                                "color": "Black",
                                "pattern": "Plain",
                                "description": "Black plain casual T-shirt"
                            }

                            Do not guess details that are not visible.
                            `
                        },
                        {
                            type: "input_image",
                            image_url: imageData,
                            detail: "low"
                        }
                    ]
                }
            ]
        });

        const result = JSON.parse(response.output_text);

        res.json({
            success: true,
            analysis: result
        });

    } catch (error) {

        console.error("AI Detection Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to analyse the image. Please try again."
        });

    }

});

// Start server
app.listen(PORT, () => {
    console.log(`Wardrobe AI Backend running at http://localhost:${PORT}`);
});