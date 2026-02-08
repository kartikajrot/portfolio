# Kartik Ajrot - Complete Portfolio with Color-Changing Text ✨

**Patrick Heng inspired** - Horizontal scroll portfolio with mouse-interactive text colors and improved Pac-Man physics.

## 🎯 Complete Feature List

### ✅ All Features Implemented

1. **Horizontal Scroll Navigation** (8 screens)
2. **Mouse-Reactive Circles** (throughout all screens)
3. **Bouncing Particles** (continuous physics)
4. **Color-Changing Text on Hover** (like Adidas CHILE20 screenshots)
5. **Dynamic Underlines** (on hero text)
6. **Improved Pac-Man Physics** (realistic bouncing inside circle)
7. **Video Thumbnails** (travel section)
8. **Proper Section Order** (as requested)

## 📍 The 8 Screens

```
[Scroll Down ↓]
    ↓
1. HERO → 2. DevOps Engineer → 3. Akelius+Tech → 4. Amadeus → 
5. Creative Human → 6. Travel/Videos → 7. Contact → 8. Keep Scrolling
```

### Screen-by-Screen Breakdown

**1. Hero (Red)**
- Your name: Kartik Ajrot
- Dynamic underlines
- 6 elastic circles
- Bouncing balls

**2. DevOps Engineer (Cream)**
- **COLOR-CHANGING TEXT** ✨
- Hover mouse over letters
- Random colors appear: orange, yellow, purple, cyan
- Just like Adidas CHILE20 screenshots

**3. Akelius + Tech Stack (Cream)**
- LEFT: Experience details with bullets
- RIGHT: Tech stack in white card
- Hover effects on tech tags

**4. Amadeus (Black)**
- Company badge (orange)
- TWO roles with timeframes:
  - Senior DevOps Engineer (2021-2024)
  - Software Engineer - DevOps (2018-2020)

**5. Creative Human (Cream)**
- **COLOR-CHANGING TEXT** ✨
- Same hover effect as screen 2

**6. Travel & Videos (Purple)**
- 6 video cards (3x2 grid)
- Placeholder thumbnails with play buttons
- Hover effects
- **Add your videos**: Replace `Travel Video 1` etc.

**7. Contact (Orange)**
- Social links
- Berlin, Germany location
- Hover effects on links

**8. Keep Scrolling (Cream + Black Circle)**
- Large black circle viewport
- "Keep scroooolling" text (bouncy)
- **8 Pac-Man blobs with IMPROVED PHYSICS**:
  - Fall from top
  - Bounce on text (first big bounce)
  - Second smaller bounce
  - Third micro bounce
  - Settle at 40% from top
  - Loop continuously
  - All happens INSIDE circle

## 🎨 Color-Changing Text Effect

The text on "DevOps Engineer" and "Creative Human" screens changes color on hover!

**How it works:**
```javascript
// Splits text into individual letters
// On mouse move, calculates distance to each letter
// If mouse is within 100px, assigns random color
// Colors: orange, yellow, purple, cyan, red
```

**Colors used:**
- #ff5722 (red-orange)
- #ffa726 (orange)
- #9b59b6 (purple)
- #ffb84d (yellow)
- #00d4ff (cyan)

Just move your mouse over the text and watch letters change color!

## 🎯 Pac-Man Physics Improvements

The Pac-Man blobs now have **realistic bouncing physics**:

```
Animation Timeline (4 seconds):
0-25%:  Fall from top with rotation
35%:    HIT TEXT - First big bounce (scale up 1.15x)
45%:    Bounce up (back to 25% height)
55%:    Fall back - Second bounce (scale 1.1x)
62%:    Smaller bounce up
70%:    Third micro bounce
85-100%: Settle and stay at 40% height
```

Each blob:
- Starts at different position (10%, 20%, 35%... 92%)
- Has staggered delay (0s, 0.4s, 0.8s... 2.8s)
- Rotates while falling (360° complete rotation)
- Scales on bounce (simulates impact)
- 8 blobs total (more than before!)

## 🚀 Quick Start

```bash
unzip portfolio-final.zip
cd portfolio-final
npm install
npm run dev
# Open http://localhost:3000
# Scroll down to move right!
```

## 🎨 Customization Guide

### Update Your Info

**Name** (`src/App1.jsx` line 390):
```javascript
<h1 id="kartik-text">Your First Name</h1>
<h1 id="ajrot-text">Your Last Name</h1>
```

**Akelius Experience** (lines 420-432):
```javascript
<p className="period">Your Date · Your City</p>
<li>Your achievement here</li>
```

**Amadeus Roles** (lines 440-470):
- Update both Senior and Junior role details
- Change dates, bullets, achievements

**Video Titles** (line 490):
```javascript
<span className="video-title">Your Video Title</span>
```

**Social Links** (line 515):
```javascript
<a href="your-url">Your Platform</a>
```

### Add Real Videos

Replace placeholders in travel section:

```javascript
// Option 1: Video thumbnails
<div className="video-thumbnail" 
     style={{ backgroundImage: 'url(/path/to/thumbnail.jpg)' }}>

// Option 2: Video element
<video src="/videos/your-video.mp4" />
```

### Adjust Colors

**Color-changing text colors** (`src/App1.jsx` line 304):
```javascript
const colors = ['#ff5722', '#your-color', '#another-color'];
```

**Background colors** (`src/App.css`):
```css
.hero-screen { background: #your-color; }
.akelius-screen { background: #your-color; }
```

### Modify Pac-Man Blobs

**Add more blobs** (`src/App1.jsx` line 540):
```javascript
{[1,2,3,4,5,6,7,8,9].map(i => ...)} // Add 9th blob
```

**Change blob colors** (`src/App.css` lines 265-272):
```css
.pac-blob-1 { background: #your-color; }
```

**Adjust physics** (`src/App.css` @keyframes blobPhysics):
```css
35% { top: 40%; } /* Change bounce height */
```

## 🎯 Key Features Explained

### 1. Color-Changing Text

```javascript
<ColorChangingText className="big-title">
  DevOps Engineer
</ColorChangingText>
```

- Splits into individual `<span>` elements
- Tracks mouse position on `mousemove`
- Calculates distance to each letter
- Changes color if within 100px radius
- Smooth 0.3s transition

### 2. Horizontal Scroll

```javascript
const translateX = -scrollProgress * 100 * 8;
<div style={{ transform: `translateX(${translateX}vw)` }}>
```

- Body height: 800vh (8 screens)
- Scroll progress: 0 to 1
- Each screen: 100vw width
- Total container: 800vw

### 3. Improved Pac-Man Physics

```css
@keyframes blobPhysics {
  /* Multiple bounce sequence */
  35% { scale(1.15); } /* Impact */
  45% { translateY(-5%); } /* Rebound */
  55% { scale(1.1); } /* Second impact */
  /* ... micro bounces ... */
}
```

- Cubic-bezier easing for natural motion
- Scale changes simulate impact
- Multiple bounces decrease in intensity
- Rotation continues throughout

## 📂 File Structure

```
portfolio-final/
├── src/
│   ├── App1.jsx           # Main app (380 lines)
│   │   ├── ElasticCircle      (mouse-reactive)
│   │   ├── ThickLine          (dynamic underlines)
│   │   ├── BouncingBall       (physics)
│   │   ├── ParticleSystem     (spawner)
│   │   ├── HeroScene          (3D canvas)
│   │   └── ColorChangingText  (hover effect)
│   ├── App.css           # All styling (350 lines)
│   └── main.jsx          # React entry
├── package.json
├── vite.config.js
├── index.html
└── README.md
```

## 🎓 Technical Details

### Color-Changing Algorithm

```javascript
const handleMouseMove = (e) => {
  letters.forEach((letter, index) => {
    // Get letter center position
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Calculate distance from mouse
    const distance = Math.sqrt(
      (e.clientX - centerX)² + (e.clientY - centerY)²
    )
    
    // If close enough, change color
    if (distance < 100) {
      setColor(randomColor())
    }
  })
}
```

### Pac-Man Bounce Physics

```
Timeline:
0%:   Start above (-15%)
25%:  Fall to 35%
35%:  HIT TEXT (40%) - BOUNCE!
45%:  Rebound to 25%
55%:  Fall again to 40%
62%:  Small bounce to 32%
70%:  Micro bounce to 40%
100%: Settle at 40%
```

### Performance

- GPU-accelerated transforms
- CSS animations (not JS)
- `will-change` on animated elements
- Efficient particle cleanup
- 60fps target

## 🐛 Troubleshooting

**Color effect not working?**
- Check console for errors
- Verify React hooks are working
- Try moving mouse slowly over text

**Pac-Man not bouncing?**
- Clear browser cache
- Check CSS animation is loading
- Verify `.pac-blob` classes exist

**Horizontal scroll jumpy?**
- Reduce transition duration in `.app-container`
- Check for layout shifts
- Use Chrome DevTools Performance

**Videos not showing?**
- Add actual video files to `/public/videos/`
- Update src paths in App1.jsx
- Check file format (MP4 recommended)

## 💡 Next Steps

1. **Add Real Content**
   - Replace video placeholders
   - Update all text to match your experience
   - Add actual project images

2. **Deploy**
   ```bash
   npm run build
   # Upload dist/ to Netlify/Vercel/GitHub Pages
   ```

3. **Optimize**
   - Compress videos
   - Add lazy loading
   - Optimize images

4. **Customize**
   - Adjust colors to your brand
   - Modify animations timing
   - Add more sections if needed

## ✨ What Makes This Special

✅ Color-changing text (like Adidas CHILE20)
✅ Realistic Pac-Man physics (3-stage bounce)
✅ Proper section order (Hero → DevOps → Akelius → Amadeus → Creative → Travel → Contact → Keep Scrolling)
✅ Video thumbnails with hover effects
✅ Clean professional design
✅ Smooth horizontal scroll
✅ Mouse-reactive circles throughout
✅ Dynamic underlines on hero

---

**Ready to explore?** Just scroll down! 🚀

The color-changing text is on screens 2 and 5. The Pac-Man circle is the final screen (8).
