# Color Blindness Simulation Algorithm Documentation

## Overview

This document explains how color blindness simulation works by comparing the original ColorLab JavaScript algorithm (`engine.js`) with the WebGL shader implementation (`blind/index.tsx`). This is written for beginners to understand both the mathematical concepts and the code implementation.

## Table of Contents
1. [Algorithm Overview](#algorithm-overview)
2. [Color Spaces Explained](#color-spaces-explained)
3. [Step-by-Step Algorithm Comparison](#step-by-step-algorithm-comparison)
4. [Code Mapping: engine.js vs Shader](#code-mapping-enginejs-vs-shader)
5. [Shader Code Explanation](#shader-code-explanation)
6. [Color Blindness Parameters](#color-blindness-parameters)

---

## Algorithm Overview

### What is Color Blindness Simulation?

Color blindness simulation mathematically transforms colors to show how they appear to people with different types of color vision deficiencies. The algorithm works by:

1. **Converting colors** from RGB to specialized color spaces (XYZ, then xyY)
2. **Finding confusion points** - points in color space where colorblind people cannot distinguish colors
3. **Projecting colors** onto a "confusion line" that connects the original color to the confusion point
4. **Intersecting** this line with a "color axis" to find the simulated color
5. **Converting back** to RGB for display

### Types of Color Blindness

- **Protanopia/Protanomaly**: Missing/reduced L-cones (red vision)
- **Deuteranopia/Deuteranomaly**: Missing/reduced M-cones (green vision)  
- **Tritanopia/Tritanomaly**: Missing/reduced S-cones (blue vision)
- **Achromatopsia/Achromatomaly**: Missing/reduced all color vision (monochrome)

---

## Color Spaces Explained

### RGB Color Space
- **What**: Red, Green, Blue values (0-255 or 0.0-1.0)
- **Why**: How monitors display colors
- **Problem**: Not perceptually uniform - mathematical operations don't match human vision

### XYZ Color Space
- **What**: Mathematical representation of human color vision
- **X**: Roughly corresponds to red-green perception
- **Y**: Luminance (brightness)  
- **Z**: Roughly corresponds to blue-yellow perception
- **Why**: Based on human eye sensitivity curves

### xyY Color Space (Chromaticity Coordinates)
- **x**: X / (X + Y + Z) - normalized red-green component
- **y**: Y / (X + Y + Z) - normalized luminance component
- **Y**: Actual luminance value
- **Why**: Separates color (x,y) from brightness (Y), making color blindness calculations easier

---

## Step-by-Step Algorithm Comparison

### Step 1: Input Preparation

**ColorLab (engine.js lines 1530-1535):**
```javascript
// Input: RGB values 0-255
var c = new Color;
c.r = Math.pow( r/255, gamma );  // gamma = 2.2
c.g = Math.pow( g/255, gamma );
c.b = Math.pow( b/255, gamma );
```

**Shader (index.tsx lines 180-181):**
```glsl
vec4 texColor = texture2D(u_image, v_texCoord);
vec3 c = pow(texColor.rgb, vec3(u_gamma));  // u_gamma = 2.2
```

**Explanation:**
- **Gamma correction**: Converts display RGB values to linear RGB for mathematical accuracy
- **Why gamma**: Monitors don't display colors linearly - gamma correction compensates for this
- **Math.pow(x, 2.2)**: Converts from sRGB (monitor space) to linear RGB (math space)

### Step 2: RGB to XYZ Conversion

**ColorLab (engine.js lines 1435-1437):**
```javascript
this.x = ( 0.4306*this.r + 0.3416*this.g + 0.1783*this.b );
this.y = ( 0.2220*this.r + 0.7067*this.g + 0.0713*this.b );
this.z = ( 0.0202*this.r + 0.1296*this.g + 0.9392*this.b );
```

**Shader (index.tsx lines 146-155, 171-173):**
```glsl
const mat3 matrixRgbXyz = mat3(
  0.4306, 0.3416, 0.1783,
  0.2220, 0.7067, 0.0713,
  0.0202, 0.1296, 0.9392
);

vec3 rgbToXyz(vec3 c) {
  return matrixRgbXyz * c;
}
```

**Explanation:**
- **Matrix transformation**: Converts RGB to XYZ using standard color science matrices
- **Why these numbers**: Based on CIE color matching functions - how human eyes respond to different wavelengths
- **Matrix multiplication**: Each XYZ component is a weighted sum of RGB components

### Step 3: XYZ to xyY Conversion

**ColorLab (engine.js lines 1536-1542):**
```javascript
var sum_xyz = c.x + c.y + c.z;
c.u = 0;  c.v = 0;
if ( sum_xyz != 0 ) {
    c.u = c.x / sum_xyz;  // x chromaticity
    c.v = c.y / sum_xyz;  // y chromaticity  
}
// Y luminance = c.y (unchanged)
```

**Shader (index.tsx lines 174-178):**
```glsl
vec3 xyzToXyy(vec3 xyz) {
  float sum = xyz.x + xyz.y + xyz.z;
  if(sum == 0.0) return vec3(0.0, 0.0, xyz.y);
  return vec3(xyz.x/sum, xyz.y/sum, xyz.y);
}
```

**Explanation:**
- **Normalization**: Divides X and Y by total to get chromaticity coordinates
- **Why normalize**: Separates color information (x,y) from brightness (Y)
- **Division by zero check**: Prevents math errors for pure black pixels

### Step 4: Confusion Line Calculation

**ColorLab (engine.js lines 1556-1565):**
```javascript
// clm = confusion line slope
if ( c.u < blind[t].cpu ) {
    clm = (blind[t].cpv - c.v) / (blind[t].cpu - c.u);
} else {
    clm = (c.v - blind[t].cpv) / (c.u - blind[t].cpu);
}
clyi = c.v -  c.u * clm;  // confusion line y-intercept
```

**Shader (index.tsx lines 193-200):**
```glsl
float slope;
if (xyy.x < u_blinder.x) {  // u_blinder.x = cpu (confusion point u)
    slope = (u_blinder.y - xyy.y) / (u_blinder.x - xyy.x);
} else {
    slope = (xyy.y - u_blinder.y) / (xyy.x - u_blinder.x);
}
float yi = xyy.y - xyy.x * slope;
```

**Explanation:**
- **Confusion line**: Mathematical line connecting current color to confusion point
- **Conditional slope**: Different formula depending on which side of confusion point the color is on
- **Why conditional**: Ensures consistent line direction, especially important for tritanopia with negative cpv
- **slope = rise/run**: Standard line slope formula (change in y / change in x)
- **y-intercept**: Where line crosses y-axis (when x=0)

### Step 5: Color Axis Intersection

**ColorLab (engine.js lines 1567-1568):**
```javascript
d.u = (blind[t].ayi - clyi) / (clm - blind[t].am);  // intersection u coordinate
d.v = (clm * d.u) + clyi;                           // intersection v coordinate  
```

**Shader (index.tsx lines 200-201):**
```glsl
float dx = (u_blinder.w - yi) / (slope - u_blinder.z);  // u_blinder.w = ayi, u_blinder.z = am
float dy = slope * dx + yi;
```

**Explanation:**
- **Line intersection**: Where confusion line meets color axis (the line colorblind people can still distinguish)
- **Algebra**: Solving system of two linear equations (confusion line + color axis)
- **dx, dy**: The intersection point coordinates in xyY space
- **Why intersection**: This point represents how the colorblind person perceives the original color

### Step 6: Convert Back to XYZ

**ColorLab (engine.js lines 1570-1572):**
```javascript
s.x = d.u * c.y / d.v;              // new X coordinate
s.y = c.y;                          // Y (luminance) unchanged
s.z = ( 1 - (d.u+d.v) ) * c.y / d.v;  // new Z coordinate
```

**Shader (index.tsx lines 202-204):**
```glsl
float simX = dx * xyy.z / dy;              // xyy.z is luminance Y
float simY = xyy.z;                        // luminance unchanged
float simZ = (1.0 - (dx + dy)) * xyy.z / dy;
```

**Explanation:**
- **xyY back to XYZ**: Reverse the chromaticity coordinate conversion
- **Preserve luminance**: Brightness stays the same, only color changes
- **Formula derivation**: From xyY definition: X = x*Y/y, Z = (1-x-y)*Y/y

### Step 7: Neutral Color Calculation

**ColorLab (engine.js lines 1544-1545):**
```javascript
var nx = wx * c.y / wy;  // neutral X for this luminance
var nz = wz * c.y / wy;  // neutral Z for this luminance
```

**Shader (index.tsx lines 205-206):**
```glsl
float ngx = 0.312713 * xyy.z / 0.329016;  // wx * Y / wy
float ngz = 0.358271 * xyy.z / 0.329016;  // wz * Y / wy
```

**Explanation:**
- **White point**: Standard reference white (usually D65 daylight)
- **Neutral color**: What pure gray looks like at this brightness level
- **Why needed**: Reference point for adjusting colors back into displayable RGB range

### Step 8: Color Adjustment Calculation

**ColorLab (engine.js lines 1574-1577):**
```javascript
d.x = nx - s.x;  // difference from neutral
d.z = nz - s.z;
d.rgb_from_xyz(); // convert differences to RGB space
```

**Shader (index.tsx lines 207-212):**
```glsl
float dX = ngx - simX;
float dZ = ngz - simZ;
vec3 dRGB;
dRGB.r = dX * matrixXyzRgb[0][0] + dZ * matrixXyzRgb[0][2];
dRGB.g = dX * matrixXyzRgb[1][0] + dZ * matrixXyzRgb[1][2];  
dRGB.b = dX * matrixXyzRgb[2][0] + dZ * matrixXyzRgb[2][2];
```

**Explanation:**
- **Color difference**: How far the simulated color is from neutral
- **Partial matrix multiply**: Only X and Z components (Y difference is 0)
- **Why differences**: Used to shift colors back into displayable RGB gamut

### Step 9: RGB Gamut Adjustment

**ColorLab (engine.js lines 1579-1586):**
```javascript
adjr = d.r  ?  ( (s.r<0 ? 0 : 1) - s.r ) / d.r  :  0;
adjg = d.g  ?  ( (s.g<0 ? 0 : 1) - s.g ) / d.g  :  0;
adjb = d.b  ?  ( (s.b<0 ? 0 : 1) - s.b ) / d.b  :  0;
adjust = Math.max(
    (  ( adjr>1 || adjr<0 )   ?   0   :   adjr  ),
    (  ( adjg>1 || adjg<0 )   ?   0   :   adjg  ),
    (  ( adjb>1 || adjb<0 )   ?   0   :   adjb  )
);
```

**Shader (index.tsx lines 217-223):**
```glsl
float _r = (dRGB.r != 0.0) ? ((simRGB.r < 0.0 ? 0.0 : 1.0) - simRGB.r) / dRGB.r : 0.0;
float _g = (dRGB.g != 0.0) ? ((simRGB.g < 0.0 ? 0.0 : 1.0) - simRGB.g) / dRGB.g : 0.0;
float _b = (dRGB.b != 0.0) ? ((simRGB.b < 0.0 ? 0.0 : 1.0) - simRGB.b) / dRGB.b : 0.0;
_r = (_r > 1.0 || _r < 0.0) ? 0.0 : _r;
_g = (_g > 1.0 || _g < 0.0) ? 0.0 : _g;
_b = (_b > 1.0 || _b < 0.0) ? 0.0 : _b;
float adjust = max(_r, max(_g, _b));
```

**Explanation:**
- **Gamut clipping**: Some calculated colors are outside displayable RGB range (negative or > 1)
- **Adjustment factor**: How much to shift toward neutral to make color displayable
- **Division by zero check**: Prevents math errors when dRGB component is zero
- **Range validation**: Ensures adjustment factors are reasonable (0-1)
- **Maximum adjustment**: Uses the largest needed adjustment for all components

### Step 10: Apply Adjustment and Final Output

**ColorLab (engine.js lines 1587-1612):**
```javascript
s.r = s.r + ( adjust * d.r );
s.g = s.g + ( adjust * d.g );
s.b = s.b + ( adjust * d.b );
// Apply inverse gamma and clamp to 0-1
sim[t] = dec_to_hex(255*Math.pow( s.r, 1/gamma ));  // + similar for g,b
```

**Shader (index.tsx lines 224-230):**
```glsl
simRGB += adjust * dRGB;
simRGB = clamp(simRGB, 0.0, 1.0);
simRGB = pow(simRGB, vec3(1.0/u_gamma));
if(u_anomalize) {
  simRGB = (1.75 * simRGB + c) / 2.75;
}
gl_FragColor = vec4(clamp(simRGB, 0.0, 1.0), texColor.a);
```

**Explanation:**
- **Apply adjustment**: Shift simulated color toward neutral by calculated amount
- **Clamp**: Ensure RGB values stay in 0-1 range
- **Inverse gamma**: Convert back to display RGB (linear → sRGB)  
- **Anomalous vision**: Blend simulated color with original (partial color blindness)
- **Final output**: Set pixel color with original transparency

---

## Code Mapping: engine.js vs Shader

| Purpose | ColorLab engine.js | Shader index.tsx | Explanation |
|---------|-------------------|------------------|-------------|
| **Input prep** | lines 1530-1535 | lines 180-181 | Gamma correction of input RGB |
| **RGB→XYZ** | lines 1435-1437 | lines 146-150, 171-173 | Matrix transform to XYZ space |
| **XYZ→xyY** | lines 1536-1542 | lines 174-178 | Convert to chromaticity coordinates |
| **Confusion line** | lines 1556-1565 | lines 193-200 | Calculate line to confusion point |
| **Intersection** | lines 1567-1568 | lines 200-201 | Find intersection with color axis |
| **xyY→XYZ** | lines 1570-1572 | lines 202-204 | Convert simulated color back to XYZ |
| **XYZ→RGB** | lines 1448-1450 | lines 151-155, 213-216 | Transform to RGB for display |
| **Neutral calc** | lines 1544-1545 | lines 205-206 | Calculate neutral reference color |
| **Adjustment** | lines 1579-1586 | lines 217-223 | Calculate gamut correction |
| **Final output** | lines 1587-1612 | lines 224-230 | Apply correction and output |

---

## Shader Code Explanation

### Uniforms (Shader Inputs)
```glsl
uniform sampler2D u_image;    // Input texture (the image)
uniform vec4 u_blinder;       // (cpu, cpv, am, ayi) - color blindness parameters  
uniform bool u_anomalize;     // True for anomalous vision (partial color blindness)
uniform bool u_achroma;       // True for monochrome vision
uniform float u_gamma;        // Gamma value (2.2)
```

### Color Space Conversion Functions

**toLinear() - lines 157-163:**
```glsl
vec3 toLinear(vec3 c) {
  vec3 linear;
  linear.r = (c.r <= 0.04045) ? c.r / 12.92 : pow((c.r + 0.055)/1.055, 2.4);
  // ... similar for g, b
  return linear;
}
```
- **Purpose**: sRGB → linear RGB conversion
- **Why**: sRGB has complex gamma curve, not simple power function
- **Two cases**: Different formula for dark vs bright colors

**rgbToXyz() - lines 171-173:**
```glsl
vec3 rgbToXyz(vec3 c) {
  return matrixRgbXyz * c;
}
```
- **Purpose**: Convert linear RGB to XYZ color space
- **Matrix multiply**: Each XYZ component is weighted sum of RGB

**xyzToXyy() - lines 174-178:**
```glsl
vec3 xyzToXyy(vec3 xyz) {
  float sum = xyz.x + xyz.y + xyz.z;
  if(sum == 0.0) return vec3(0.0, 0.0, xyz.y);
  return vec3(xyz.x/sum, xyz.y/sum, xyz.y);
}
```
- **Purpose**: Convert XYZ to chromaticity coordinates
- **Return**: (x, y, Y) where x,y are normalized, Y is luminance

### Main Shader Logic

**Fragment shader main() - lines 179-231:**

1. **Get pixel color**: `texture2D(u_image, v_texCoord)`
2. **Gamma correct**: `pow(texColor.rgb, vec3(u_gamma))`
3. **Handle monochrome**: Special case for achromatopsia
4. **Color space conversion**: RGB → XYZ → xyY  
5. **Confusion line**: Calculate slope and y-intercept
6. **Intersection**: Find where confusion line meets color axis
7. **Simulate color**: Convert intersection back to XYZ then RGB
8. **Gamut adjustment**: Make sure color is displayable
9. **Final processing**: Anomalous blending and output

### Key Mathematical Concepts

**Matrix Multiplication:**
```glsl
vec3 result = matrix * vector;
// Equivalent to:
result.x = matrix[0][0]*vector.x + matrix[0][1]*vector.y + matrix[0][2]*vector.z;
result.y = matrix[1][0]*vector.x + matrix[1][1]*vector.y + matrix[1][2]*vector.z;  
result.z = matrix[2][0]*vector.x + matrix[2][1]*vector.y + matrix[2][2]*vector.z;
```

**Line Equations:**
```glsl
// Point-slope form: y - y1 = m(x - x1)
// Slope-intercept form: y = mx + b
float slope = (y2 - y1) / (x2 - x1);
float y_intercept = y1 - x1 * slope;
```

**Line Intersection:**
```glsl
// Two lines: y = m1*x + b1, y = m2*x + b2
// Intersection x: (b2 - b1) / (m1 - m2)
// Intersection y: m1*x + b1
```

---

## Color Blindness Parameters

### Parameter Structure (u_blinder vec4)
- **x component**: Confusion point u-coordinate (cpu)
- **y component**: Confusion point v-coordinate (cpv)  
- **z component**: Color axis slope (am)
- **w component**: Color axis y-intercept (ayi)

### Protanopia (Red-blind)
```javascript
cpu = 0.735, cpv = 0.265
abu = 0.115807, abv = 0.073581  // Color axis start (473nm)
aeu = 0.471899, aev = 0.527051  // Color axis end (574nm)
am = 1.273463, ayi = -0.073894  // Calculated slope and intercept
```

### Deuteranopia (Green-blind)  
```javascript
cpu = 1.14, cpv = -0.14
abu = 0.102776, abv = 0.102864  // Color axis start (477nm)
aeu = 0.505845, aev = 0.493211  // Color axis end (579nm)
am = 0.968437, ayi = 0.003331   // Calculated slope and intercept
```

### Tritanopia (Blue-blind)
```javascript
cpu = 0.171, cpv = -0.003       // Note: negative cpv!
abu = 0.045391, abv = 0.294976  // Color axis start (490nm)  
aeu = 0.665764, aev = 0.334011  // Color axis end (610nm)
am = 0.062921, ayi = 0.292120   // Calculated slope and intercept
```

### Notes on Parameters
- **Confusion points**: Where colorblind people cannot distinguish any colors
- **Color axis**: Line of colors they CAN still distinguish
- **Wavelengths**: Based on spectral sensitivity of human cones
- **Tritanopia cpv**: Negative value makes it mathematically different from protan/deutan

---

## Common Beginner Questions

**Q: Why so many color space conversions?**
A: Each color space is good for different operations. RGB is for displays, XYZ matches human vision, xyY separates color from brightness.

**Q: What's the difference between -opia and -omaly?**  
A: -opia means missing cones (complete color blindness), -omaly means reduced cones (partial color blindness).

**Q: Why gamma correction?**
A: Monitors don't display colors linearly. Gamma correction makes math operations match visual perception.

**Q: What are confusion points?**
A: Points in color space where people with color blindness cannot distinguish any colors - everything looks the same.

**Q: Why is tritanopia different?**
A: It has a negative confusion point v-coordinate, making the math more complex and requiring special handling.

**Q: What's the color axis?**
A: The line of colors that colorblind people CAN still distinguish. It connects two wavelengths they can differentiate.

This algorithm is a faithful implementation of established color science research, providing scientifically accurate color blindness simulation for accessibility testing.