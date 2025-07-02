# German Dictation Tool - Modular Architecture

This is a refactored version of the German Dictation Tool, now using a modern modular architecture while maintaining 100% of the original functionality.

## 📁 Project Structure

```
dictation-tool/
├── index.html                  # Main application (modular architecture)
├── index-original.html         # Original single-file implementation (reference)
├── side-by-side-comparison.html # Visual comparison tool (optional)
├── css/
│   └── styles.css             # All styles extracted and organized
├── js/
│   ├── app.js                 # Main application controller
│   ├── config.js              # Configuration constants
│   ├── modules/               # Feature modules
│   │   ├── audio-player.js    # Audio playback and controls
│   │   ├── auto-resize.js     # Iframe auto-resize functionality
│   │   ├── export.js          # CSV export functionality
│   │   ├── german-chars.js    # German character conversion
│   │   ├── keyboard-shortcuts.js # Keyboard shortcuts handling
│   │   ├── lesson-loader.js   # Lesson loading and VTT parsing
│   │   ├── state-manager.js   # Central state management
│   │   ├── statistics.js      # Statistics tracking and display
│   │   ├── text-comparison.js # Text comparison algorithms
│   │   └── ui-controls.js     # UI interactions and controls
│   └── utils/                 # Utility modules
│       ├── dom-helpers.js     # DOM manipulation utilities
│       └── time-helpers.js    # Time formatting and utilities
├── audio/                     # Audio files and VTT subtitles
└── lessons/
    └── lessons.json          # Lesson configuration
```

## 📄 File Descriptions

### Main Files
- **`index.html`**: The current application using modular architecture. Use this for development and production.
- **`index-original.html`**: The original single-file implementation (2700+ lines). Kept for reference and comparison.
- **`side-by-side-comparison.html`**: Visual comparison tool showing both versions side-by-side. Useful for testing and verification.

### Why Keep Multiple Versions?
1. **Reference**: Original shows the "before" state
2. **Comparison**: Side-by-side testing ensures feature parity  
3. **Backup**: Original serves as working fallback
4. **Documentation**: Shows the evolution of the codebase

## 🚀 Features

All original features are preserved:

- **Audio Playback**: Sentence-by-sentence dictation with speed control
- **Live Feedback**: Real-time character-level comparison
- **German Characters**: Automatic conversion (ae→ä, oe→ö, ue→ü, B→ß)
- **Keyboard Shortcuts**: Full keyboard navigation
- **Statistics**: Detailed accuracy tracking and results
- **Export**: CSV export of results
- **Responsive Design**: Mobile and desktop friendly
- **Auto-resize**: Works perfectly in iframes

## 🛠 Technical Improvements

### Modular Architecture Benefits

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Individual modules can be unit tested
3. **Reusability**: Modules can be reused in other projects
4. **Performance**: Modern ES6 modules with tree-shaking support
5. **Debugging**: Easier to locate and fix issues
6. **Collaboration**: Multiple developers can work on different modules

### Module Descriptions

#### Core Modules

- **`app.js`**: Main application controller that orchestrates all modules
- **`state-manager.js`**: Centralized state management with subscription system
- **`config.js`**: All configuration constants and settings

#### Feature Modules

- **`audio-player.js`**: Handles audio playback, VTT cues, speed control, and navigation
- **`text-comparison.js`**: Advanced text comparison algorithms with word alignment
- **`ui-controls.js`**: User interface interactions, live feedback, and input handling
- **`lesson-loader.js`**: Loads lessons and parses VTT files with error handling
- **`keyboard-shortcuts.js`**: Comprehensive keyboard shortcut system
- **`statistics.js`**: Session tracking, accuracy calculation, and results display
- **`export.js`**: CSV export functionality with multiple format options
- **`german-chars.js`**: German character conversion and text normalization
- **`auto-resize.js`**: Iframe auto-resize with ResizeObserver and fallbacks

#### Utility Modules

- **`dom-helpers.js`**: Safe DOM manipulation utilities
- **`time-helpers.js`**: Time formatting, parsing, and helper functions

## 🔧 Usage

### Basic Usage

Simply open `index.html` in a web browser or serve it via a web server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server

# Then open http://localhost:8000
```

### URL Parameters

The tool supports the same URL parameters as before:

```
http://localhost:8000/?lesson=A1L05
```

### Keyboard Shortcuts

All original shortcuts are preserved:

- **Shift + Cmd/Ctrl + Enter**: Play/Pause
- **Shift + Cmd/Ctrl + ←/→**: Previous/Next sentence
- **Shift + Cmd/Ctrl + ↑**: Play current sentence
- **Shift + Cmd/Ctrl + ↓**: Toggle speed
- **Shift + Cmd/Ctrl + / (or ß, ,)**: Show hint
- **Enter**: Submit current sentence

## 🔌 API Usage

### Using Individual Modules

```javascript
import { GermanChars } from './js/modules/german-chars.js';
import { TextComparison } from './js/modules/text-comparison.js';

// Convert German characters
const converted = GermanChars.convert('Hallo wie gehts?');

// Compare texts
const result = TextComparison.compareTexts('Reference', 'User input');
```

### State Management

```javascript
import { StateManager } from './js/modules/state-manager.js';

const state = new StateManager();

// Subscribe to changes
state.subscribe(({ path, newValue }) => {
    console.log(`${path} changed to:`, newValue);
});

// Update state
state.update('currentLessonId', 'A1L05');
```

### Custom Audio Player

```javascript
import { AudioPlayer } from './js/modules/audio-player.js';

const audioElement = document.getElementById('audioPlayer');
const player = new AudioPlayer(audioElement);

player.setCallbacks({
    onPlay: () => console.log('Started playing'),
    onPause: () => console.log('Paused'),
    onSentenceChange: (index, cue) => console.log('Sentence changed', index)
});
```

## 🧪 Testing

The modular architecture makes testing much easier:

### Unit Testing Example

```javascript
import { GermanChars } from './js/modules/german-chars.js';

// Test German character conversion
console.assert(GermanChars.convert('ae') === 'ä');
console.assert(GermanChars.convert('oe') === 'ö');
console.assert(GermanChars.convert('ue') === 'ü');
console.assert(GermanChars.convert('HalloB') === 'Halloß');
```

### Integration Testing

```javascript
import { DictationApp } from './js/app.js';

const app = new DictationApp();
await app.initialize();

// Test lesson loading
await app.loadLesson('A1L01');
console.assert(app.state.getCurrentLesson() === 'A1L01');
```

## 🔄 Migration from Original

The modular version is 100% backward compatible:

1. **Same HTML structure**: All IDs and classes preserved
2. **Same CSS classes**: Styling remains identical
3. **Same functionality**: Every feature works exactly the same
4. **Same URL parameters**: Lesson selection works as before
5. **Same keyboard shortcuts**: All shortcuts preserved
6. **Same export format**: CSV exports are identical

## 🏗 Extending the Application

### Adding New Features

1. **Create a new module** in `js/modules/`
2. **Import it** in `app.js`
3. **Wire up callbacks** in the `setupCallbacks()` method
4. **Subscribe to state changes** if needed

### Example: Adding a New Module

```javascript
// js/modules/my-feature.js
export class MyFeature {
    constructor() {
        this.isEnabled = false;
    }
    
    initialize() {
        // Setup code
    }
    
    enable() {
        this.isEnabled = true;
    }
}

// In app.js
import { MyFeature } from './modules/my-feature.js';

// Add to constructor
this.myFeature = new MyFeature();

// Initialize in the initialize() method
this.myFeature.initialize();
```

## 📦 Dependencies

- **No external dependencies**: Pure vanilla JavaScript
- **Modern browsers**: Requires ES6 module support
- **Optional polyfills**: For older browser support

## 🔧 Configuration

All configuration is centralized in `js/config.js`:

```javascript
export const CONFIG = {
    lessonsUrl: 'https://example.com/lessons.json',
    autoResizeDelay: 50,
    hintAutoHideDelay: 8000,
    // ... other settings
};
```

## 🐛 Debugging

The modular architecture makes debugging much easier:

1. **Open browser DevTools**
2. **Check console** for module loading errors
3. **Access global app instance**: `window.dictationApp`
4. **Inspect state**: `window.dictationApp.getState()`

### Debug Commands

```javascript
// Get current state
window.dictationApp.getState()

// Access individual modules
window.dictationApp.audioPlayer
window.dictationApp.statistics
window.dictationApp.state

// Test specific functionality
window.dictationApp.loadLesson('A1L05')
```

## 📊 Performance

The modular version maintains the same performance characteristics:

- **Fast loading**: ES6 modules load only when needed
- **Memory efficient**: Modules can be garbage collected
- **No overhead**: Modern bundlers can optimize further

## 🚀 Future Enhancements

The modular architecture enables easy future enhancements:

- **Plugin system**: Easy to add new modules
- **Theme support**: CSS modules for different themes
- **Offline support**: Service worker module
- **Advanced analytics**: Detailed learning analytics module
- **Multiple languages**: Language-specific modules

## 📄 License

Same license as the original German Dictation Tool.

---

**Note**: This refactored version maintains 100% feature parity with the original while providing a much more maintainable and extensible codebase.
