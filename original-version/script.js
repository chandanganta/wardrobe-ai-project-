
console.log("Wardrobe AI Connected!");

// ========================================
// 1. ELEMENT REFERENCES
// ========================================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const uploadBtn = document.getElementById("uploadBtn");
const imageInput = document.getElementById("imageInput");
const categorySelect = document.getElementById("clothingCategory");
const wardrobeGrid = document.getElementById("wardrobeGrid");
const totalItems = document.getElementById("totalItems");
const previewImage = document.getElementById("previewImage");

const uploadBox = document.getElementById("uploadBox") ||
    document.querySelector(".upload-box");

const filterButtons = document.querySelectorAll(".filter-btn");

const generateOutfitBtn = document.getElementById("generateOutfitBtn");
const generatedOutfit = document.getElementById("generatedOutfit");
const outfitOccasion = document.getElementById("outfitOccasion");
const outfitStyle = document.getElementById("outfitStyle");
const stylistMessage = document.getElementById("stylistMessage");
const outfitsCreated = document.getElementById("outfitsCreated");

let wardrobeItems = [];
let selectedCategory = "All";
let pendingUploadCategory = "";

let generatedOutfitCount = 0;
let lastOutfitSignature = "";

// ========================================
// 2. INDEXEDDB
// ========================================

const DB_NAME = "WardrobeAI_DB";
const DB_VERSION = 1;
const STORE_NAME = "clothes";

let db;

function openDatabase() {
    return new Promise((resolve, reject) => {

        if (!window.indexedDB) {
            reject(new Error("IndexedDB is not supported."));
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            db.onversionchange = () => db.close();

            console.log("IndexedDB Connected!");
            resolve(db);
        };

        request.onerror = () => reject(request.error);

        request.onblocked = () => {
            console.warn("Close other Wardrobe AI tabs and refresh.");
        };
    });
}

// SAVE ITEM

function saveItem(item) {
    return new Promise((resolve, reject) => {

        if (!db) {
            reject(new Error("Database is not ready."));
            return;
        }

        const transaction = db.transaction(STORE_NAME, "readwrite");

        transaction.objectStore(STORE_NAME).put(item);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

// GET ALL ITEMS

function getAllItems() {
    return new Promise((resolve, reject) => {

        if (!db) {
            reject(new Error("Database is not ready."));
            return;
        }

        const transaction = db.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

// DELETE ITEM

function deleteItemFromDB(id) {
    return new Promise((resolve, reject) => {

        if (!db) {
            reject(new Error("Database is not ready."));
            return;
        }

        const transaction = db.transaction(STORE_NAME, "readwrite");

        transaction.objectStore(STORE_NAME).delete(id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

// ========================================
// 3. LOAD SAVED WARDROBE
// ========================================

async function loadWardrobe() {

    const savedItems = await getAllItems();

    wardrobeItems.forEach(item => {
        if (item.image) {
            URL.revokeObjectURL(item.image);
        }
    });

    wardrobeItems = savedItems.map(item => ({
        ...item,
        category: item.category || "Uncategorised",
        image: URL.createObjectURL(item.imageBlob)
    }));

    if (previewImage && wardrobeItems.length > 0) {
        previewImage.src = wardrobeItems[wardrobeItems.length - 1].image;
    }

    updateWardrobe();

    console.log("Saved wardrobe loaded:", wardrobeItems.length);
}

// ========================================
// 4. MOBILE NAVIGATION
// ========================================

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", () => {

        navLinks.classList.toggle("show");

        menuToggle.textContent =
            navLinks.classList.contains("show") ? "✕" : "☰";

    });

    document.querySelectorAll(".nav-links a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("show");
            menuToggle.textContent = "☰";

        });

    });
}

// ========================================
// 5. IMAGE UPLOAD AND CATEGORY SYSTEM
// ========================================

const allowedCategories = [
    "Tops",
    "Bottoms",
    "Shoes",
    "Accessories"
];

if (uploadBtn && imageInput) {

    uploadBtn.addEventListener("click", () => {

        const chosenCategory = categorySelect?.value?.trim() || "";

        if (!allowedCategories.includes(chosenCategory)) {

            alert("Please select a clothing category first.");

            categorySelect?.focus();

            return;
        }

        pendingUploadCategory = chosenCategory;

        imageInput.click();

    });

    imageInput.addEventListener("change", handleImageUpload);
}

// ========================================
// 6. AI IMAGE ANALYSIS
// ========================================

async function analyzeClothingImage(file) {

    const formData = new FormData();

    formData.append("image", file);

    const response = await fetch(
        "http://localhost:3000/api/analyze-clothing",
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success || !data.analysis) {

        throw new Error(
            data.message || "AI analysis is not available yet."
        );

    }

    return data.analysis;
}

// ========================================
// 7. HANDLE IMAGE UPLOAD
// ========================================

async function handleImageUpload(event) {

    const file = event.target.files?.[0];

    if (!file) return;

    const uploadCategory =
        pendingUploadCategory ||
        categorySelect?.value?.trim() ||
        "";

    pendingUploadCategory = "";

    if (!allowedCategories.includes(uploadCategory)) {

        alert("Please select a valid clothing category.");

        imageInput.value = "";

        return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {

        alert("Please choose a JPG, PNG or WEBP image.");

        imageInput.value = "";

        return;
    }

    if (file.size > 5 * 1024 * 1024) {

        alert("Please choose an image smaller than 5 MB.");

        imageInput.value = "";

        return;
    }

    if (!db) {

        alert("Database is not ready. Please refresh.");

        imageInput.value = "";

        return;
    }

    try {

        const cleanName =
            file.name.replace(/\.[^/.]+$/, "") || "Clothing item";

        let analysis = null;
        let finalCategory = uploadCategory;
        let aiStatus = "pending";

        // AI ANALYSIS

        try {

            console.log("Sending image to Wardrobe AI backend...");

            analysis = await analyzeClothingImage(file);

            const detectedCategory =
                String(analysis.category || "").trim();

            if (allowedCategories.includes(detectedCategory)) {
                finalCategory = detectedCategory;
            }

            aiStatus = "analysed";

            console.log("AI analysis:", analysis);

        } catch (aiError) {

            aiStatus = "not-configured";

            console.info(
                "AI analysis unavailable. Using selected category:",
                aiError.message
            );

        }

        // CREATE WARDROBE ITEM

        const newItem = {

            id: window.crypto?.randomUUID?.() ||
                `${Date.now()}-${Math.random()}`,

            name: analysis?.type
                ? `${analysis.color || ""} ${analysis.type}`.trim()
                : cleanName,

            category: finalCategory,

            imageBlob: file,

            createdAt: new Date().toISOString(),

            color: analysis?.color || "",

            clothingType: analysis?.type || "",

            pattern: analysis?.pattern || "",

            description: analysis?.description || "",

            aiStatus: aiStatus

        };

        await saveItem(newItem);

        const imageURL = URL.createObjectURL(file);

        wardrobeItems.push({

            ...newItem,

            image: imageURL

        });

        if (previewImage) {
            previewImage.src = imageURL;
        }

        selectedCategory = finalCategory;

        filterButtons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.category === finalCategory
            );

        });

        updateWardrobe();

        if (aiStatus === "analysed") {

            alert(
                `AI analysed and saved your ${finalCategory.toLowerCase()} item!`
            );

        } else {

            alert(
                `${finalCategory} item saved! AI detection will activate when the API is configured.`
            );

        }

        console.log("Saved item:", newItem);

    } catch (error) {

        console.error("Upload failed:", error);

        alert("Unable to save image. Please try again.");

    } finally {

        imageInput.value = "";

    }
}

// ========================================
// 8. CATEGORY FILTERING
// ========================================

function getVisibleItems() {

    if (selectedCategory === "All") {
        return wardrobeItems;
    }

    return wardrobeItems.filter(item => {
        return item.category === selectedCategory;
    });
}

// ========================================
// 9. DISPLAY WARDROBE
// ========================================

function displayWardrobe(items) {

    if (!wardrobeGrid) return;

    if (totalItems) {
        totalItems.textContent = wardrobeItems.length;
    }

    if (items.length === 0) {

        const message = selectedCategory === "All"
            ? "Upload your first clothing item to get started."
            : `No items found in ${selectedCategory}.`;

        wardrobeGrid.innerHTML = "";

        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = "♧";

        const heading = document.createElement("h3");
        heading.textContent = "Your wardrobe is waiting";

        const paragraph = document.createElement("p");
        paragraph.textContent = message;

        const link = document.createElement("a");
        link.href = "#upload";
        link.className = "primary-btn";
        link.textContent = "Add Your First Item";

        emptyState.append(icon, heading, paragraph, link);
        wardrobeGrid.appendChild(emptyState);

        return;
    }

    wardrobeGrid.innerHTML = "";

    items.forEach(item => {

        const card = document.createElement("div");
        card.className = "clothing-card";

        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.name || "Wardrobe item";

        const info = document.createElement("div");
        info.className = "clothing-info";

        const heading = document.createElement("h4");
        heading.textContent = item.name || "Clothing item";

        const categoryLabel = document.createElement("p");
        categoryLabel.textContent = item.category;

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.type = "button";
        deleteButton.textContent = "Remove Item";

        deleteButton.addEventListener("click", async () => {

            try {

                await deleteItemFromDB(item.id);

                URL.revokeObjectURL(item.image);

                wardrobeItems = wardrobeItems.filter(clothing => {
                    return clothing.id !== item.id;
                });

                updateWardrobe();

                console.log("Item deleted:", item.id);

            } catch (error) {

                console.error("Delete failed:", error);

                alert("Unable to delete this item.");

            }

        });

        info.append(heading, categoryLabel, deleteButton);

        card.append(image, info);

        wardrobeGrid.appendChild(card);

    });

}

function updateWardrobe() {

    displayWardrobe(getVisibleItems());

}

// ========================================
// 10. CATEGORY FILTER BUTTONS
// ========================================

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        selectedCategory = button.dataset.category || "All";

        filterButtons.forEach(btn => {

            btn.classList.toggle("active", btn === button);

        });

        updateWardrobe();

    });

});

// ========================================
// 11. SMART OUTFIT BUILDER
// ========================================

// Random item picker

function getRandomItem(items) {

    if (!items || items.length === 0) {
        return null;
    }

    const randomIndex = Math.floor(Math.random() * items.length);

    return items[randomIndex];
}

// Get items by category

function getItemsByCategory(category) {

    return wardrobeItems.filter(item => {
        return item.category === category;
    });

}

// Create a combination

function createOutfitCombination() {

    const tops = getItemsByCategory("Tops");
    const bottoms = getItemsByCategory("Bottoms");
    const shoes = getItemsByCategory("Shoes");
    const accessories = getItemsByCategory("Accessories");

    // Tops and bottoms are required

    if (tops.length === 0 || bottoms.length === 0) {
        return null;
    }

    const outfit = [];

    const selectedTop = getRandomItem(tops);
    const selectedBottom = getRandomItem(bottoms);

    outfit.push({
        item: selectedTop,
        role: "Top"
    });

    outfit.push({
        item: selectedBottom,
        role: "Bottom"
    });

    // Add shoes if available

    if (shoes.length > 0) {

        outfit.push({
            item: getRandomItem(shoes),
            role: "Shoes"
        });

    }

    // Add accessories if available

    if (accessories.length > 0) {

        outfit.push({
            item: getRandomItem(accessories),
            role: "Accessory"
        });

    }

    return outfit;

}

// Check outfit combination

function getOutfitSignature(outfit) {

    return outfit
        .map(entry => entry.item.id)
        .join("-");

}

// ========================================
// 12. OUTFIT DESCRIPTION
// ========================================

function createOutfitDescription(outfit, occasion, style) {

    const top = outfit.find(entry => entry.role === "Top");
    const bottom = outfit.find(entry => entry.role === "Bottom");

    const shoes = outfit.find(entry => entry.role === "Shoes");
    const accessory = outfit.find(entry => entry.role === "Accessory");

    let description =
        `Your ${style.toLowerCase()} ${occasion.toLowerCase()} outfit combines ` +
        `${top.item.name} with ${bottom.item.name}.`;

    if (shoes) {
        description += ` Complete the combination with ${shoes.item.name}.`;
    }

    if (accessory) {
        description += ` Add ${accessory.item.name} as an extra detail.`;
    }

    description += " This combination uses items already saved in your wardrobe.";

    return description;

}

// ========================================
// 13. RENDER GENERATED OUTFIT
// ========================================

function renderGeneratedOutfit(outfit, occasion, style) {

    if (!generatedOutfit) return;

    generatedOutfit.innerHTML = "";

    const result = document.createElement("div");
    result.className = "generated-result";

    // Header

    const header = document.createElement("div");
    header.className = "generated-result-header";

    const headerText = document.createElement("div");

    const heading = document.createElement("h4");
    heading.textContent = "Your Outfit Is Ready";

    const subtitle = document.createElement("p");
    subtitle.textContent = "A combination from your personal wardrobe.";

    headerText.append(heading, subtitle);

    const tag = document.createElement("span");
    tag.className = "outfit-tag";
    tag.textContent = occasion.toUpperCase();

    header.append(headerText, tag);

    // Item grid

    const itemGrid = document.createElement("div");
    itemGrid.className = "generated-items";

    outfit.forEach(entry => {

        const item = entry.item;

        const card = document.createElement("div");
        card.className = "generated-item";

        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.name || entry.role;
        image.loading = "lazy";

        const info = document.createElement("div");
        info.className = "generated-item-info";

        const role = document.createElement("span");
        role.textContent = entry.role;

        const name = document.createElement("h5");
        name.textContent = item.name || "Clothing item";

        const category = document.createElement("p");
        category.textContent = item.category;

        info.append(role, name, category);

        card.append(image, info);

        itemGrid.appendChild(card);

    });

    // Description

    const descriptionBox = document.createElement("div");
    descriptionBox.className = "generated-outfit-description";

    const description = document.createElement("p");

    const descriptionText = createOutfitDescription(
        outfit,
        occasion,
        style
    );

    description.textContent = descriptionText;

    descriptionBox.appendChild(description);

    // Action buttons

    const actions = document.createElement("div");
    actions.className = "outfit-result-actions";

    const regenerateButton = document.createElement("button");
    regenerateButton.type = "button";
    regenerateButton.className = "regenerate-btn";
    regenerateButton.textContent = "↻ Regenerate Outfit";

    regenerateButton.addEventListener("click", generateOutfit);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "secondary-action";
    copyButton.textContent = "Copy Outfit Description";

    copyButton.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(descriptionText);

            copyButton.textContent = "✓ Copied!";

            setTimeout(() => {
                copyButton.textContent = "Copy Outfit Description";
            }, 1800);

        } catch (error) {

            console.error("Copy failed:", error);

            if (stylistMessage) {
                stylistMessage.textContent =
                    "Copy was unavailable in this browser. You can select the description manually.";
                stylistMessage.className = "stylist-note error";
            }

        }

    });

    actions.append(regenerateButton, copyButton);

    result.append(
        header,
        itemGrid,
        descriptionBox,
        actions
    );

    generatedOutfit.appendChild(result);

}

// ========================================
// 14. GENERATE OUTFIT
// ========================================

function generateOutfit() {

    if (!generatedOutfit) return;

    const occasion = outfitOccasion?.value || "Everyday";
    const style = outfitStyle?.value || "Any";

    const tops = getItemsByCategory("Tops");
    const bottoms = getItemsByCategory("Bottoms");

    // Check required wardrobe items

    if (tops.length === 0 || bottoms.length === 0) {

        generatedOutfit.innerHTML = "";

        const placeholder = document.createElement("div");
        placeholder.className = "stylist-placeholder";

        const icon = document.createElement("span");
        icon.textContent = "✦";

        const heading = document.createElement("h4");
        heading.textContent = "Your wardrobe needs a few more pieces.";

        const paragraph = document.createElement("p");
        paragraph.textContent =
            "Add at least one Top and one Bottom to generate an outfit.";

        placeholder.append(icon, heading, paragraph);

        generatedOutfit.appendChild(placeholder);

        if (stylistMessage) {
            stylistMessage.textContent =
                "Add Tops and Bottoms to unlock your outfit combinations.";
            stylistMessage.className = "stylist-note error";
        }

        return;
    }

    // Generate a combination

    let outfit = createOutfitCombination();

    if (!outfit) return;

    let signature = getOutfitSignature(outfit);

    // Try to avoid showing the same combination twice

    let attempts = 0;

    while (
        signature === lastOutfitSignature &&
        attempts < 10
    ) {

        outfit = createOutfitCombination();

        signature = getOutfitSignature(outfit);

        attempts++;

    }

    lastOutfitSignature = signature;

    // Display result

    renderGeneratedOutfit(outfit, occasion, style);

    generatedOutfitCount++;

    if (outfitsCreated) {
        outfitsCreated.textContent = generatedOutfitCount;
    }

    if (stylistMessage) {

        stylistMessage.textContent =
            "✦ Your outfit has been created using your saved wardrobe items.";

        stylistMessage.className = "stylist-note success";

    }

    console.log("Generated outfit:", outfit);

}

// Generate button

if (generateOutfitBtn) {

    generateOutfitBtn.addEventListener("click", generateOutfit);

}

// ========================================
// 15. SCROLL REVEAL ANIMATIONS
// ========================================

const revealElements = document.querySelectorAll(
    ".section-heading, .stat-card, .upload-content, .upload-preview, .outfit-card"
);

revealElements.forEach(element => {
    element.classList.add("reveal");
});

if ("IntersectionObserver" in window) {

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

                observer.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.12
    });

    revealElements.forEach(element => {
        observer.observe(element);
    });

} else {

    revealElements.forEach(element => {
        element.classList.add("visible");
    });