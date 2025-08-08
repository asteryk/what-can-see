"use client";

/*
 * color-blind
 *
 * This source was copied from http://mudcu.be/sphere/js/Color.Blind.js
 *
 * It contains modifications for use in node.js.
 *
 * The original copyright is included below.
 *
 * Here is a license note copied/edited from (http://colorlab.wickline.org/colorblind/colorlab/engine.js)
 *
 *  20221013 UPDATE
 *      HCIRN appears to no longer exist. This makes it impractical
 *      for users to obtain permission from HCIRN in order to use
 *      this file for commercial works. Instead:
 *
 *      This work is licensed under a
 *      Creative Commons Attribution-ShareAlike 4.0 International License.
 *      http://creativecommons.org/licenses/by-sa/4.0/
 */
/*

    The Color Blindness Simulation function is
    copyright (c) 2000-2001 by Matthew Wickline and the
    Human-Computer Interaction Resource Network ( http://hcirn.com/ ).
    
    It is used with the permission of Matthew Wickline and HCIRN,
    and is freely available for non-commercial use. For commercial use, please
    contact the Human-Computer Interaction Resource Network ( http://hcirn.com/ ).

	------------------------
	blind.protan =
		cpu = 0.735; // confusion point, u coord
		cpv = 0.265; // confusion point, v coord
		abu = 0.115807; // color axis begining point (473nm), u coord
		abv = 0.073581; // color axis begining point (473nm), v coord
		aeu = 0.471899; // color axis ending point (574nm), u coord
		aev = 0.527051; // color axis ending point (574nm), v coord
	blind.deutan =
		cpu =  1.14; // confusion point, u coord
		cpv = -0.14; // confusion point, v coord
		abu = 0.102776; // color axis begining point (477nm), u coord
		abv = 0.102864; // color axis begining point (477nm), v coord
		aeu = 0.505845; // color axis ending point (579nm), u coord
		aev = 0.493211; // color axis ending point (579nm), v coord
	blind.tritan =
		cpu =  0.171; // confusion point, u coord
		cpv = -0.003; // confusion point, v coord
		abu = 0.045391; // color axis begining point (490nm), u coord
		abv = 0.294976; // color axis begining point (490nm), v coord
		aeu = 0.665764; // color axis ending point (610nm), u coord
		aev = 0.334011; // color axis ending point (610nm), v coord
			
	m = (aev - abv) / (aeu - abu); // slope of color axis
	yi = blind[t].abv - blind[t].abu * blind[t].m; // "y-intercept" of axis (on the "v" axis at u=0)

*/

// Blind.js
import React, { useRef, ChangeEvent, useState, useEffect } from "react";
import "./index.css";

const colorBlindSimulations = [
  {
    id: "cb-canvasProtanomaly",
    label: "Protanomaly",
    type: "protan",
    anomalize: true,
    blinder: { x: 0.7465, y: 0.2535, m: 1.273463, yi: -0.073894 },
  },
  {
    id: "cb-canvasProtanopia",
    label: "Protanopia",
    type: "protan",
    anomalize: false,
    blinder: { x: 0.7465, y: 0.2535, m: 1.273463, yi: -0.073894 },
  },
  {
    id: "cb-canvasDeuteranomaly",
    label: "Deuteranomaly",
    type: "deutan",
    anomalize: true,
    blinder: { x: 1.4, y: -0.4, m: 0.968437, yi: 0.003331 },
  },
  {
    id: "cb-canvasDeuteranopia",
    label: "Deuteranopia",
    type: "deutan",
    anomalize: false,
    blinder: { x: 1.4, y: -0.4, m: 0.968437, yi: 0.003331 },
  },
  {
    id: "cb-canvasTritanomaly",
    label: "Tritanomaly",
    type: "tritan",
    anomalize: true,
    blinder: { x: 0.171, y: -0.003, m: 0.062921, yi: 0.292120 },
  },
  {
    id: "cb-canvasTritanopia",
    label: "Tritanopia",
    type: "tritan",
    anomalize: false,
    blinder: { x: 0.171, y: -0.003, m: 0.062921, yi: 0.292120 },
  },
  {
    id: "cb-canvasAchromatomaly",
    label: "Achromatomaly",
    type: "achroma",
    anomalize: true,
    blinder: {},
  },
  {
    id: "cb-canvasAchromatopsia",
    label: "Achromatopsia",
    type: "achroma",
    anomalize: false,
    blinder: {},
  },
];

// Color blindness simulation vertex shader
const vertexShaderSourceCB = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main(){
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Color blindness simulation fragment shader
const fragmentShaderSourceCB = `
  precision mediump float;
  uniform sampler2D u_image;
  // u_blinder: (x, y, m, yi)
  uniform vec4 u_blinder;
  uniform bool u_anomalize;
  uniform bool u_achroma;
  uniform float u_gamma;
  varying vec2 v_texCoord;

  const mat3 matrixRgbXyz = mat3(
    0.4306, 0.3416, 0.1783,
    0.2220, 0.7067, 0.0713,
    0.0202, 0.1296, 0.9392
  );
  const mat3 matrixXyzRgb = mat3(
    3.0632, -1.3933, -0.4758,
    -0.9692, 1.8760, 0.0416,
    0.0679, -0.2289, 1.0693
  );

  vec3 toLinear(vec3 c) {
    vec3 linear;
    linear.r = (c.r <= 0.04045) ? c.r / 12.92 : pow((c.r + 0.055)/1.055, 2.4);
    linear.g = (c.g <= 0.04045) ? c.g / 12.92 : pow((c.g + 0.055)/1.055, 2.4);
    linear.b = (c.b <= 0.04045) ? c.b / 12.92 : pow((c.b + 0.055)/1.055, 2.4);
    return linear;
  }
  vec3 toSrgb(vec3 c) {
    vec3 srgb;
    srgb.r = (c.r <= 0.0031308) ? 12.92 * c.r : 1.055 * pow(c.r, 1.0/2.4) - 0.055;
    srgb.g = (c.g <= 0.0031308) ? 12.92 * c.g : 1.055 * pow(c.g, 1.0/2.4) - 0.055;
    srgb.b = (c.b <= 0.0031308) ? 12.92 * c.b : 1.055 * pow(c.b, 1.0/2.4) - 0.055;
    return srgb;
  }
  vec3 rgbToXyz(vec3 c) {
    return matrixRgbXyz * c;
  }
  vec3 xyzToXyy(vec3 xyz) {
    float sum = xyz.x + xyz.y + xyz.z;
    if(sum == 0.0) return vec3(0.0, 0.0, xyz.y);
    return vec3(xyz.x/sum, xyz.y/sum, xyz.y);
  }
  void main(){
    vec4 texColor = texture2D(u_image, v_texCoord);
    vec3 c = pow(texColor.rgb, vec3(u_gamma));
    if(u_achroma) {
      float gray = dot(c, vec3(0.212656, 0.715158, 0.072186));
      vec3 result = vec3(gray);
      if(u_anomalize) {
        result = (1.75 * result + c) / 2.75;
      }
      gl_FragColor = vec4(result, texColor.a);
      return;
    }
    vec3 xyz = rgbToXyz(c);
    vec3 xyy = xyzToXyy(xyz);
    float slope;
    if (xyy.x < u_blinder.x) {
        slope = (u_blinder.y - xyy.y) / (u_blinder.x - xyy.x);
    } else {
        slope = (xyy.y - u_blinder.y) / (xyy.x - u_blinder.x);
    }
    float yi = xyy.y - xyy.x * slope;
    float dx = (u_blinder.w - yi) / (slope - u_blinder.z);
    float dy = slope * dx + yi;
    float simX = dx * xyy.z / dy;
    float simY = xyy.z;
    float simZ = (1.0 - (dx + dy)) * xyy.z / dy;
    float ngx = 0.312713 * xyy.z / 0.329016;
    float ngz = 0.358271 * xyy.z / 0.329016;
    float dX = ngx - simX;
    float dZ = ngz - simZ;
    vec3 dRGB;
    dRGB.r = dX * matrixXyzRgb[0][0] + dZ * matrixXyzRgb[0][2];
    dRGB.g = dX * matrixXyzRgb[1][0] + dZ * matrixXyzRgb[1][2];
    dRGB.b = dX * matrixXyzRgb[2][0] + dZ * matrixXyzRgb[2][2];
    vec3 simRGB;
    simRGB.r = simX * matrixXyzRgb[0][0] + simY * matrixXyzRgb[0][1] + simZ * matrixXyzRgb[0][2];
    simRGB.g = simX * matrixXyzRgb[1][0] + simY * matrixXyzRgb[1][1] + simZ * matrixXyzRgb[1][2];
    simRGB.b = simX * matrixXyzRgb[2][0] + simY * matrixXyzRgb[2][1] + simZ * matrixXyzRgb[2][2];
    float _r = (dRGB.r != 0.0) ? ((simRGB.r < 0.0 ? 0.0 : 1.0) - simRGB.r) / dRGB.r : 0.0;
    float _g = (dRGB.g != 0.0) ? ((simRGB.g < 0.0 ? 0.0 : 1.0) - simRGB.g) / dRGB.g : 0.0;
    float _b = (dRGB.b != 0.0) ? ((simRGB.b < 0.0 ? 0.0 : 1.0) - simRGB.b) / dRGB.b : 0.0;
    _r = (_r > 1.0 || _r < 0.0) ? 0.0 : _r;
    _g = (_g > 1.0 || _g < 0.0) ? 0.0 : _g;
    _b = (_b > 1.0 || _b < 0.0) ? 0.0 : _b;
    float adjust = max(_r, max(_g, _b));
    simRGB += adjust * dRGB;
    simRGB = clamp(simRGB, 0.0, 1.0);
    simRGB = pow(simRGB, vec3(1.0/u_gamma));
    if(u_anomalize) {
      simRGB = (1.75 * simRGB + c) / 2.75;
    }
    gl_FragColor = vec4(clamp(simRGB, 0.0, 1.0), texColor.a);
  }
`;

// Init WebGL
function initColorBlindGL(
  canvas: HTMLCanvasElement,
  simSetting:
    | {
        id: string;
        label: string;
        type: string;
        anomalize: boolean;
        blinder: { x: number; y: number; m: number; yi: number };
      }
    | {
        id: string;
        label: string;
        type: string;
        anomalize: boolean;
        blinder: {
          x?: undefined;
          y?: undefined;
          m?: undefined;
          yi?: undefined;
        };
      },
  image: HTMLImageElement
) {
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("WebGL Not Support");
    return;
  }
  canvas.width = image.width;
  canvas.height = image.height;
  gl.viewport(0, 0, canvas.width, canvas.height);

  const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSourceCB);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSourceCB);
  const program = createProgram(gl, vShader!, fShader!);
  gl.useProgram(program);

  // Upload full screen quad data
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  const a_position = gl.getAttribLocation(program!, "a_position");
  const a_texCoord = gl.getAttribLocation(program!, "a_texCoord");
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(a_texCoord);
  gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 16, 8);

  // Create texture upload image
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // Set uniform vars
  const u_image = gl.getUniformLocation(program!, "u_image");
  gl.uniform1i(u_image, 0);
  const u_blinder = gl.getUniformLocation(program!, "u_blinder");
  if (simSetting.blinder) {
    gl.uniform4f(
      u_blinder,
      simSetting.blinder.x || 0.0,
      simSetting.blinder.y || 0.0,
      simSetting.blinder.m || 0.0,
      simSetting.blinder.yi || 0.0
    );
  } else {
    gl.uniform4f(u_blinder, 0.0, 0.0, 0.0, 0.0);
  }
  const u_anomalize = gl.getUniformLocation(program!, "u_anomalize");
  gl.uniform1i(u_anomalize, simSetting.anomalize ? 1 : 0);
  const u_achroma = gl.getUniformLocation(program!, "u_achroma");
  gl.uniform1i(u_achroma, simSetting.type === "achroma" ? 1 : 0);
  const u_gamma = gl.getUniformLocation(program!, "u_gamma");
  gl.uniform1f(u_gamma, 2.2);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const visualEffects = [
  { id: "vi-canvasOriginal", effect: 0, label: "Original" },
  { id: "vi-canvasCataracts", effect: 1, label: "Cataracts" },
  { id: "vi-canvasGlaucoma", effect: 2, label: "Glaucoma" },
  { id: "vi-canvasLowvision", effect: 3, label: "Lowvision" },
  { id: "vi-canvasNightshift", effect: 4, label: "Nightshift" },
  { id: "vi-canvasSunlight", effect: 5, label: "Sunlight" },
];

// Vision Impairment simulation vertex shader
const vertexShaderSourceVI = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main(){
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Vision Impairment, based on u_effect
const fragmentShaderSourceVI = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform int u_effect;
  uniform vec2 u_texelSize;

  vec3 adjustSaturation(vec3 color, float saturation) {
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(gray), color, saturation);
  }

  vec3 blur9() {
      vec3 sum = vec3(0.0);
      for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
              vec2 offset = vec2(float(x), float(y)) * u_texelSize;
              sum += texture2D(u_image, v_texCoord + offset).rgb;
          }
      }
      return sum / 12.0;
  }

  void main(){
    vec3 color = texture2D(u_image, v_texCoord).rgb;
    if(u_effect == 0) {
      gl_FragColor = vec4(color, 1.0);
    } else if(u_effect == 1) {
      vec3 blurred = blur9();
      float noise = fract(sin(dot(v_texCoord.xy, vec2(20.9898,78.233))) * 43758.5453);
      vec3 haze = mix(blurred, vec3(1.0), 0.4 * noise);
      gl_FragColor = vec4(haze, 1.0);
    } else if(u_effect == 2) {
      vec3 blurred = blur9();
      float dist = distance(v_texCoord, vec2(0.5, 0.5));
      float mask = 1.0 - smoothstep(0.0, 0.4, dist);
      vec3 result = mix(blurred, vec3(1.0), mask * 0.5);
      gl_FragColor = vec4(result, 1.0);
    } else if(u_effect == 3) {
      vec3 sum = vec3(0.0);
      for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
              vec2 offset = vec2(float(x), float(y)) * u_texelSize;
              sum += texture2D(u_image, v_texCoord + offset).rgb;
          }
      }
      vec3 strongerBlur = sum / 25.0;
      gl_FragColor = vec4(strongerBlur, 1.0);
    } else if(u_effect == 4) {
      vec3 sat = adjustSaturation(color, 1.2);
      vec3 warm = sat * vec3(1.05, 1.0, 0.95) + vec3(0.05, 0.0, 0.0);
      gl_FragColor = vec4(warm, 1.0);
    } else if(u_effect == 5) {
      vec3 bright = color * 1.2;
      float grad = clamp((v_texCoord.x + v_texCoord.y) * 0.5, 0.0, 1.0);
      vec3 result = mix(bright, bright + vec3(0.1), grad);
      gl_FragColor = vec4(result, 1.0);
    } else {
      gl_FragColor = vec4(color, 1.0);
    }
  }
`;

// Init WebGL for Vision Impairment
function initVIWebGL(
  canvas: HTMLCanvasElement,
  effectNum: number,
  image: HTMLImageElement
) {
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("WebGL Unsupported");
    alert("WebGL Unsupported");
    return;
  }
  canvas.width = image.width;
  canvas.height = image.height;
  gl.viewport(0, 0, canvas.width, canvas.height);

  const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSourceVI);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSourceVI);
  const program = createProgram(gl, vShader!, fShader!);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  const a_position = gl.getAttribLocation(program!, "a_position");
  const a_texCoord = gl.getAttribLocation(program!, "a_texCoord");
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(a_texCoord);
  gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 16, 8);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  const u_image = gl.getUniformLocation(program!, "u_image");
  gl.uniform1i(u_image, 0);
  const u_effect = gl.getUniformLocation(program!, "u_effect");
  gl.uniform1i(u_effect, effectNum);
  const u_texelSize = gl.getUniformLocation(program!, "u_texelSize");
  gl.uniform2f(u_texelSize, 1.0 / canvas.width, 1.0 / canvas.height);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const quadVertices = new Float32Array([
  -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1, 1,
]);

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader!, source);
  gl.compileShader(shader!);
  if (!gl.getShaderParameter(shader!, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader!));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}


function Simulations() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  const processFile = (file: Blob) => {
    // Prevent any potential navigation/refresh
    if (typeof window !== 'undefined') {
      window.onbeforeunload = null;
    }
    
    setError(null);
    setDebugInfo([]);
    
    addDebugInfo(`File selected: ${(file as File).name || 'unknown'}`);
    addDebugInfo(`File type: ${file.type || 'unknown'}`);
    addDebugInfo(`File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError(`Unsupported file type: ${file.type}. Please use JPG, PNG, or other standard image formats.`);
      setLoading(false);
      return;
    }
    
    // Check file size (limit to 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Please use an image smaller than 50MB.');
      setLoading(false);
      return;
    }
    
    const reader = new FileReader();
    
    reader.onerror = () => {
      addDebugInfo('FileReader error occurred');
      setError('Failed to read the image file. Please try a different image.');
      setLoading(false);
    };
    
    reader.onload = (evt) => {
      addDebugInfo('File read successfully');
      const img = new Image();
      
      img.onerror = () => {
        addDebugInfo('Image loading failed');
        setError('Failed to load the image. The file might be corrupted or in an unsupported format.');
        setLoading(false);
      };
      
      img.onload = () => {
        addDebugInfo(`Image loaded: ${img.width}x${img.height}`);
        
        try {
          // colorBlindSimulations
          colorBlindSimulations.forEach((sim) => {
            const canvas = document.getElementById(sim.id) as HTMLCanvasElement;
            if (canvas) {
              try {
                initColorBlindGL(canvas, sim, img);
                addDebugInfo(`Color blind simulation ${sim.label} rendered`);
              } catch (err) {
                addDebugInfo(`Error in ${sim.label}: ${err}`);
                console.error(`Error in color blind simulation ${sim.label}:`, err);
              }
            }
          });
          
          // visualEffects
          visualEffects.forEach((effect) => {
            const canvas = document.getElementById(effect.id) as HTMLCanvasElement;
            if (canvas) {
              try {
                initVIWebGL(canvas, effect.effect, img);
                addDebugInfo(`Visual effect ${effect.label} rendered`);
              } catch (err) {
                addDebugInfo(`Error in ${effect.label}: ${err}`);
                console.error(`Error in visual effect ${effect.label}:`, err);
              }
            }
          });
          
          addDebugInfo('All simulations completed successfully');
          setRendered(true);
        } catch (err) {
          addDebugInfo(`General rendering error: ${err}`);
          setError('Failed to process the image. Your device might not support the required features.');
          console.error('Processing error:', err);
        }
        
        setLoading(false);
      };
      
      if (!!evt?.target?.result) {
        addDebugInfo('Setting image source');
        img.src = evt.target.result as string;
      } else {
        addDebugInfo('No result from FileReader');
        setError('Failed to read the image data.');
        setLoading(false);
      }
    };
    
    addDebugInfo('Starting to read file as data URL');
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      setRendered(false);
      processFile(e.target.files[0]);
    }
    
    // Reset the input value to allow re-uploading the same file
    e.target.value = '';
  };
  
  const clearError = () => {
    setError(null);
    setDebugInfo([]);
  };

  // Prevent page refresh on file operations
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        return '';
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent Enter key from submitting any forms
      if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName === 'INPUT') {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keypress', handleKeyPress);
    };
  }, [loading]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (fileInputRef.current && !loading) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`simulation`}>
      {/* File input wrapper to prevent form submission */}
      <div className="file-input-wrapper" onSubmit={(e) => e.preventDefault()}>
        <div
          className={`upload-card ${loading ? "upload-card__loading" : ""}`}
          onClick={handleCardClick}>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
            ref={fileInputRef}
            style={{ display: "none" }}
            disabled={loading}
            onChange={handleFileChange}
            onClick={(e) => e.stopPropagation()}
          />
          <p>{loading ? "Loading..." : "Upload a photo or design screenshot here"}</p>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="error-message">
          <div className="error-content">
            <h4>⚠️ Upload Error</h4>
            <p>{error}</p>
            <div className="error-actions">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearError();
                }} 
                className="error-button"
                type="button"
              >
                Try Again
              </button>
            </div>
            <details className="debug-details">
              <summary>Debug Information</summary>
              <div className="debug-info">
                {debugInfo.map((info, index) => (
                  <div key={index} className="debug-line">{info}</div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}
      {/* Vision Impairment */}
      <div className={`simulation-section ${rendered? 'photo__rendered': ''}`}>
        <h3>Vision Impairment</h3>
        <div id="visualImpairmentContainer" className={`container`} tabIndex={rendered? -1: 1}>
          {visualEffects.map((effect) => (
            <div className="canvasItem" key={effect.id}>
              <canvas id={effect.id}></canvas>
              <p className="type-label" aria-label={effect.label}>{effect.label}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Color Blind */}
      <div className={`simulation-section ${rendered? 'photo__rendered': ''}`} tabIndex={rendered? -1: 1}>
        <h3>Color Blind</h3>
        <div id="colorBlindContainer" className={`container`}>
          {colorBlindSimulations.map((sim) => (
            <div className="simResult" key={sim.id}>
              <canvas id={sim.id}></canvas>
              <p>{sim.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Simulations;
