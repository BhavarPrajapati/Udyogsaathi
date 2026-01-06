# 🚀 Udyog Saathi - Professional MERN Stack Platform

**Udyog Saathi** is a robust MERN stack application designed to bridge the gap between local workers and businesses. The platform focuses on high performance, seamless cloud integration, and AI-driven user assistance.

## ✨ Key Features

* **🤖 AI Career Guru:** Integrated Google Gemini (Gemini 1.5 Flash) to provide users with personalized professional career guidance.
* **☁️ Optimized Cloud Storage:** Leverages Cloudinary for all profile and post images, ensuring a lightweight MongoDB database and lightning-fast image loading.
* **🔔 Intelligent Notifications:** Features an "Instagram-style" notification system where the unread badge automatically resets upon visiting the notification center.
* **💬 Interactive Messages Hub:** Facilitates direct real-time communication between businesses and approved applicants.
* **📱 Responsive & Modern UI:** A fully optimized interface tailored for both Mobile and Desktop users.

## 🛠️ Tech Stack

* **Frontend:** React.js, Vite, Tailwind CSS.
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB Atlas.
* **Cloud Media:** Cloudinary.
* **AI Engine:** Google Generative AI SDK.

## ⚙️ Environment Variables (.env)

The following keys are required for the backend setup:

```env
MONGO_URI=mongodb_connection_string
CLOUDINARY_CLOUD_NAME=cloud_name
CLOUDINARY_API_KEY=api_key
CLOUDINARY_API_SECRET=api_secret
GEMINI_API_KEY=gemini_api_key