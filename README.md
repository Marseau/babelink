# 🌍 Babelink

**Capture, Translate & Listen** - A cross-platform app inspired by the Tower of Babel concept.

## ✨ Features

- **📸 Screen Capture**: Draggable frame for precise text selection
- **🔍 OCR**: Google ML Kit text extraction
- **🌍 Translation**: IBM Watson (50+ languages)
- **🗣️ Text-to-Speech**: Progressive word highlighting
- **💫 Modern UI**: Magic UI design system
- **☁️ Cloud Sync**: Supabase backend

## 🏗️ Architecture

### **Frontend**
- **Desktop**: Next.js + Magic UI + Tauri
- **Mobile**: React Native + Magic UI
- **Web**: Progressive Web App

### **Backend**
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Authentication
- **Storage**: Supabase Storage
- **API**: Auto-generated + Edge Functions

## 🚀 Quick Start

### **Desktop App**
```bash
cd desktop
npm install
npm run tauri dev
```

### **Mobile App**
```bash
cd mobile
npm install
npm run ios    # or npm run android
```

### **Web App**
```bash
cd desktop
npm install
npm run dev
```

## 📱 Platforms

- ✅ **macOS** (native Tauri)
- ✅ **Windows** (native Tauri)
- ✅ **Linux** (native Tauri)
- ✅ **iOS** (React Native)
- ✅ **Android** (React Native)
- ✅ **Web** (Progressive Web App)

## 🛠️ Tech Stack

- **Frontend**: Next.js, React Native, Magic UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Native**: Tauri (Rust)
- **Translation**: IBM Watson Language Translator
- **OCR**: Tesseract.js, Google Cloud Vision
- **TTS**: Web Speech API, ElevenLabs

## 🎯 Development Roadmap

### Phase 1: Core Features
- [ ] Basic screen capture
- [ ] OCR text extraction
- [ ] Translation service
- [ ] Text-to-speech

### Phase 2: Enhanced UX
- [ ] Draggable frame UI
- [ ] Progressive word highlighting
- [ ] Language selection
- [ ] Voice customization

### Phase 3: Cloud Features
- [ ] User authentication
- [ ] History sync
- [ ] Usage analytics
- [ ] Subscription management

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Magic UI for beautiful components
- Supabase for backend infrastructure
- IBM Watson for translation services
- Tauri for cross-platform desktop

---

**Built with ❤️ by [Marseau](https://github.com/Marseau)**