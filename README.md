# Composio Executive Assistant

This is an AI Agent built using Composio and Vercel, it is a personal assistant with the capability to access your email, calendar, and slack. 

## Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm package manager

## Installation

1. Clone the repository:
```bash
git clone https://github.com/composio-ai/executive-assistant.git
cd Executive-Assistant
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your required environment variables:
```
NEXT_PUBLIC_COMPOSIO_API_KEY=your_api_key
NEXT_PUBLIC_GROQ_API_KEY=your_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_api_key
NEXT_PUBLIC_NODE_ENV=development
# Add other environment variables here
```

## Running the Application

1. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.