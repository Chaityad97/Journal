Journal
An Expo + React Native idea journal for capturing notes, organizing them into folders, exploring connections in a visual graph, and asking an AI assistant to reason over your saved ideas.

Features
Capture ideas with a title, core note, source, folder, and tags
Auto-save drafts while writing
Organize ideas with color-coded folders
Filter and search ideas from the main feed
Explore relationships in an interactive graph view
Connect and disconnect related ideas manually
Chat with an AI assistant that uses your idea library as context
Save AI responses back into existing ideas
Use semantic search and insight-generation services when an OpenAI API key is configured
Fall back to keyword-based search when AI is unavailable
Tech Stack
Expo
React Native
Expo Router
TypeScript
Zustand
AsyncStorage
OpenAI API
Jest + Testing Library
Project Structure
journal/
|-- app/                 # Expo Router screens
|   |-- (tabs)/          # Feed, graph, insights, profile tabs
|   |-- create-idea.tsx  # Idea creation flow
|   |-- idea/            # Idea detail screens
|   `-- node/            # Graph node detail screens
|-- components/          # Reusable UI components
|-- store/               # Zustand store and AI modules
|   `-- ai/              # Embeddings, search, insights, LLM integration
|-- assets/              # App icons and images
|-- __tests__/           # Store, storage, and component tests
`-- scripts/             # Utility scripts
Getting Started
Prerequisites
Node.js 18+
npm
Expo Go or an Android/iOS simulator
Install
npm install
Environment Variables
Create a .env file in the project root:

EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
The app still works without this key, but AI-powered chat, embeddings, and richer semantic features will be limited or fall back to non-AI behavior.

Run the App
npm start
Useful variants:

npm run android
npm run ios
npm run web
Available Scripts
npm start        # Start Expo dev server
npm run android  # Launch on Android
npm run ios      # Launch on iOS
npm run web      # Launch on web
npm run lint     # Run Expo linting
npm test         # Run Jest tests
How It Works
Feed
The main tab shows saved ideas, search, and folder filters. Ideas are persisted locally with Zustand + AsyncStorage.

Create Idea
New entries support:

Title
Core idea content
Source
Folder selection
Tags
Drafts are auto-saved so partially written ideas are not lost.

Graph
The graph tab visualizes ideas as connected nodes. You can:

Pan and zoom around the canvas
Filter visible nodes by folder
Connect two ideas
Remove connections
Open detail views for nodes
AI Assistant
The insights tab builds a prompt from the current idea library and sends it to OpenAI chat completions. It can help summarize themes, surface tensions, suggest links, and generate next-step ideas. Assistant messages can also be appended back into an existing idea.

Testing
Run:

npm test
Current tests cover core store behavior, storage helpers, and selected UI components.

Notes
Local state is persisted with AsyncStorage
OpenAI-backed features depend on EXPO_PUBLIC_OPENAI_API_KEY
Semantic tooling lives under store/ai
The repo currently includes screenshots in screenshots that can be used for future documentation polish
Future Improvements
Export ideas to Markdown or JSON
Add stronger analytics and AI summaries
Improve offline-first behavior for AI-related flows
Expand automated test coverage