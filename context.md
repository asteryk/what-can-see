# What Can See - Project Context

## Overview
**What Can See** is an accessible web tool that simulates visual impairments and color blindness to help designers and developers create more inclusive digital experiences. Users can upload images and see how they appear to people with different visual conditions.

## Core Purpose
- Enable users to upload photos and apply visual impairment and color blindness filters
- Promote accessibility awareness in design and development
- Provide real-time visual simulations for various conditions
- Support inclusive design practices

## Technical Architecture

### Framework & Dependencies
- **Framework**: Next.js 15.2.0 with React 19
- **Language**: TypeScript
- **Rendering**: Client-side WebGL-based image processing
- **Analytics**: Google Analytics integration
- **Fonts**: Geist Sans and Geist Mono

### Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout with metadata and GA
│   ├── page.tsx           # Main entry point
│   └── globals.css        # Global styles
└── components/
    ├── main/              # Main application wrapper
    │   ├── index.tsx      # App container with dark mode
    │   ├── index.css      # Main styling
    │   ├── gradient-text.css
    │   └── dark.css       # Dark mode styles
    └── blind/             # Simulation engine
        ├── index.tsx      # Core simulation component
        └── index.css      # Simulation UI styles
```

## Visual Simulation Features

### Color Blindness Simulations
The application simulates 8 types of color vision deficiencies:

1. **Protanomaly** - Reduced red sensitivity (anomalous)
2. **Protanopia** - Missing red cones (dichromatic)
3. **Deuteranomaly** - Reduced green sensitivity (anomalous)
4. **Deuteranopia** - Missing green cones (dichromatic)
5. **Tritanomaly** - Reduced blue sensitivity (anomalous)
6. **Tritanopia** - Missing blue cones (dichromatic)
7. **Achromatomaly** - Reduced color vision (partial monochromat)
8. **Achromatopsia** - Complete color blindness (monochromat)

### Visual Impairment Effects
The application simulates 6 visual conditions:

1. **Original** - No effect applied
2. **Cataracts** - Blurred vision with haze
3. **Glaucoma** - Peripheral vision loss with tunnel effect
4. **Low Vision** - Strong blur effect
5. **Night Shift** - Warm color temperature adjustment
6. **Sunlight** - Brightness adjustment with gradient

## Technical Implementation

### WebGL Rendering Pipeline
- **Vertex Shaders**: Handle image positioning and texture coordinates
- **Fragment Shaders**: Apply real-time visual effects using mathematical color transformations
- **Color Space Conversions**: RGB → XYZ → xyY coordinate transformations
- **Matrix Operations**: Uses scientific color transformation matrices for accurate simulations

### Color Blindness Algorithm
Based on research from Human-Computer Interaction Resource Network (HCIRN):
- Uses confusion points and color axis calculations
- Implements mathematical models for each type of color vision deficiency
- Licensed under Creative Commons Attribution-ShareAlike 4.0

### File Processing
- **Supported Formats**: JPEG, PNG, GIF, WebP, BMP, SVG
- **File Size Limit**: 50MB maximum
- **Error Handling**: Comprehensive error reporting with debug information
- **Security**: Client-side processing only, no server uploads

## User Experience Features

### Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast support
- Focus management
- Semantic HTML structure

### Interface Design
- **Dark Mode**: Complete theme switching with CSS custom properties
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Loading States**: Visual feedback during image processing
- **Error Handling**: User-friendly error messages with troubleshooting info

### Upload Experience
- Drag-and-drop interface (styled as upload card)
- File type validation
- Progress indication
- Multiple file format support
- Prevent accidental page refresh during processing

## SEO & Metadata
- Comprehensive Open Graph tags
- Twitter Card optimization
- Accessibility-focused keywords
- Structured metadata for search engines

## Development Commands
```bash
npm install          # Install dependencies
npm run dev         # Start development server with Turbopack
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
```

## External Inspirations
- **Who Can Use** - Color contrast accessibility checker
- **ColorLab by Wickline** - Color blindness simulation research
- Open source color blindness simulation algorithms

## Mission Statement
"View Without Barriers, Embrace Every Perspective" - The tool emphasizes the importance of accessible design by empowering photographers, web designers, and app developers to create inclusive digital experiences for everyone.

## File Upload Flow
1. User clicks upload card or drags file
2. Client-side validation (file type, size)
3. FileReader converts to data URL
4. Image object loads the data
5. WebGL shaders process the image for each simulation
6. Results rendered in canvas elements
7. Error handling with debug information if issues occur

## Browser Compatibility
- Requires WebGL support
- Modern browser features (ES6+, FileReader API)
- Responsive design for mobile and desktop
- Graceful degradation for unsupported features