import type { GlobalConfig, PaletteId, RendererCapabilities } from "./config/types";
interface StrokeInstances {
  data: Float32Array<ArrayBufferLike>;
  count: number;
}

interface FramebufferPair {
  textures: [WebGLTexture, WebGLTexture];
  framebuffers: [WebGLFramebuffer, WebGLFramebuffer];
  width: number;
  height: number;
  source: 0 | 1;
}

const VERTEX = `#version 300 es
in vec2 aCorner;
in vec4 aStroke;
in vec2 aShape;
uniform vec2 uContain;
out float vEdge;
out float vInk;
void main() {
  vec2 direction = vec2(cos(aStroke.z), sin(aStroke.z));
  vec2 normal = vec2(-direction.y, direction.x);
  vec2 position = aStroke.xy + direction * aCorner.x * aShape.x + normal * aCorner.y * aShape.y;
  gl_Position = vec4(position * uContain, 0.0, 1.0);
  vEdge = aCorner.y;
  vInk = aStroke.w;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uPalette;
uniform float uIntensity;
uniform float uPaletteBands;
in float vEdge;
in float vInk;
out vec4 outColor;
void main() {
  float alpha = 1.0 - smoothstep(0.78, 1.0, abs(vEdge));
  float band = floor(fract(vInk) * max(uPaletteBands, 1.0) + 1e-5);
  float paletteIndex = (band + 0.5) / max(uPaletteBands, 1.0);
  vec3 color = texture(uPalette, vec2(paletteIndex, 0.5)).rgb;
  outColor = vec4(color, alpha * uIntensity);
}`;

const BLIT_VERTEX = `#version 300 es
in vec2 aCorner;
out vec2 vUv;
void main() {
  vUv = aCorner * 0.5 + 0.5;
  gl_Position = vec4(aCorner, 0.0, 1.0);
}`;

const BLIT_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec3 uBackground;
uniform float uFade;
uniform bool uUseBackground;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 source = texture(uSource, vUv);
  outColor = uUseBackground ? vec4(mix(uBackground, source.rgb, source.a * uFade), 1.0) : source;
}`;

const PALETTES: Record<PaletteId, readonly (readonly [number, number, number])[]> = {
  aurora: [[0.05, 0.95, 0.88], [0.18, 0.42, 1], [0.95, 0.22, 0.92], [1, 0.86, 0.28], [0.95, 0.95, 0.98]],
  ember: [[1, 0.2, 0.08], [1, 0.62, 0.12], [0.92, 0.08, 0.38], [1, 0.9, 0.7], [0.55, 0.08, 0.08]],
  ultraviolet: [[0.55, 0.22, 1], [0.22, 0.72, 1], [1, 0.28, 0.82], [0.82, 0.9, 1], [0.12, 0.95, 0.42]],
  mineral: [[0.42, 0.95, 0.55], [0.12, 0.62, 0.7], [0.98, 0.76, 0.28], [0.95, 0.35, 0.32], [0.9, 0.95, 0.55]],
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info ?? "unknown error"}`);
  }
  return shader;
};

const program = (gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram => {
  const result = gl.createProgram();
  if (!result) throw new Error("Unable to create shader program.");
  const vertexShader = compile(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(result, vertexShader);
  gl.attachShader(result, fragmentShader);
  gl.linkProgram(result);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(result);
    gl.deleteProgram(result);
    throw new Error(`Shader link failed: ${info ?? "unknown error"}`);
  }
  return result;
};

export class WebglRenderer {
  readonly capabilities: RendererCapabilities;
  private readonly sceneProgram: WebGLProgram;
  private readonly blitProgram: WebGLProgram;
  private readonly cornerBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly paletteTexture: WebGLTexture;
  private readonly vao: WebGLVertexArrayObject;
  private readonly blitVao: WebGLVertexArrayObject;
  private framebuffers: FramebufferPair | undefined;
  private cssWidth = 0;
  private cssHeight = 0;
  private dpr = 1;
  private contain: [number, number] = [0.92, 0.92];

  constructor(private readonly gl: WebGL2RenderingContext) {
    const sceneProgram = program(gl, VERTEX, FRAGMENT);
    const blitProgram = program(gl, BLIT_VERTEX, BLIT_FRAGMENT);
    const cornerBuffer = gl.createBuffer();
    const instanceBuffer = gl.createBuffer();
    const paletteTexture = gl.createTexture();
    const vao = gl.createVertexArray();
    const blitVao = gl.createVertexArray();
    if (!cornerBuffer || !instanceBuffer || !paletteTexture || !vao || !blitVao) throw new Error("Unable to allocate WebGL resources.");
    this.sceneProgram = sceneProgram;
    this.blitProgram = blitProgram;
    this.cornerBuffer = cornerBuffer;
    this.instanceBuffer = instanceBuffer;
    this.paletteTexture = paletteTexture;
    this.vao = vao;
    this.blitVao = blitVao;
    this.capabilities = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
      renderScale: 1,
      webgl2: true,
    };

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const cornerLocation = gl.getAttribLocation(sceneProgram, "aCorner");
    gl.enableVertexAttribArray(cornerLocation);
    gl.vertexAttribPointer(cornerLocation, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    const strokeLocation = gl.getAttribLocation(sceneProgram, "aStroke");
    gl.enableVertexAttribArray(strokeLocation);
    gl.vertexAttribPointer(strokeLocation, 4, gl.FLOAT, false, 24, 0);
    gl.vertexAttribDivisor(strokeLocation, 1);
    const shapeLocation = gl.getAttribLocation(sceneProgram, "aShape");
    gl.enableVertexAttribArray(shapeLocation);
    gl.vertexAttribPointer(shapeLocation, 2, gl.FLOAT, false, 24, 16);
    gl.vertexAttribDivisor(shapeLocation, 1);
    gl.bindVertexArray(null);

    gl.bindVertexArray(blitVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    const blitCornerLocation = gl.getAttribLocation(blitProgram, "aCorner");
    gl.enableVertexAttribArray(blitCornerLocation);
    gl.vertexAttribPointer(blitCornerLocation, 2, gl.FLOAT, false, 8, 0);
    gl.bindVertexArray(null);

    gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.setPalette("aurora");
  }

  setPalette(palette: PaletteId): void {
    const stops = PALETTES[palette];
    const pixels = new Uint8Array(256 * 4);
    for (let index = 0; index < 256; index += 1) {
      const stop = stops[Math.floor((index / 256) * stops.length) % stops.length];
      const pixel = index * 4;
      pixels[pixel] = Math.round(stop[0] * 255);
      pixels[pixel + 1] = Math.round(stop[1] * 255);
      pixels[pixel + 2] = Math.round(stop[2] * 255);
      pixels[pixel + 3] = 255;
    }
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }

  resize(cssWidth: number, cssHeight: number, dpr: number, scale: number): boolean {
    if (cssWidth <= 0 || cssHeight <= 0) return false;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.dpr = dpr;
    const fit = 0.92;
    const aspect = cssWidth / cssHeight;
    this.contain = aspect >= 1 ? [fit / aspect, fit] : [fit, fit * aspect];
    const hardwareLimit = Math.min(this.capabilities.maxTextureSize, this.capabilities.maxRenderbufferSize);
    const requestedWidth = Math.max(1, Math.floor(cssWidth * dpr * scale));
    const requestedHeight = Math.max(1, Math.floor(cssHeight * dpr * scale));
    const clampScale = Math.min(1, hardwareLimit / Math.max(requestedWidth, requestedHeight));
    const width = Math.max(1, Math.floor(requestedWidth * clampScale));
    const height = Math.max(1, Math.floor(requestedHeight * clampScale));
    const canvas = this.gl.canvas as HTMLCanvasElement;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    if (this.framebuffers?.width === width && this.framebuffers.height === height) return true;
    const candidate = this.createFramebufferPair(width, height);
    if (!candidate) return false;
    const previous = this.framebuffers;
    this.framebuffers = candidate;
    this.capabilities.renderScale = scale * clampScale;
    if (previous) this.disposeFramebufferPair(previous);
    return true;
  }

  render(instances: StrokeInstances, config: GlobalConfig, dt: number): void {
    const target = this.framebuffers;
    if (!target) return;
    const { gl } = this;
    const next = target.source === 0 ? 1 : 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffers[next]);
    gl.viewport(0, 0, target.width, target.height);
    if (config.feedback.enabled) {
      this.blit(target.textures[target.source], config.background, Math.exp(-config.feedback.decayPerSecond * dt), true);
    } else {
      gl.clearColor(config.background[0], config.background[1], config.background[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    this.drawInstances(instances, config);
    target.source = next as 0 | 1;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, Math.max(1, Math.floor(this.cssWidth * this.dpr)), Math.max(1, Math.floor(this.cssHeight * this.dpr)));
    this.blit(target.textures[target.source], config.background, 1, false);
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`WebGL render error 0x${error.toString(16)}.`);
  }

  private blit(texture: WebGLTexture, background: readonly [number, number, number], fade: number, withBackground: boolean): void {
    const { gl } = this;
    gl.useProgram(this.blitProgram);
    gl.bindVertexArray(this.blitVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(this.blitProgram, "uSource"), 0);
    gl.uniform3fv(gl.getUniformLocation(this.blitProgram, "uBackground"), background);
    gl.uniform1f(gl.getUniformLocation(this.blitProgram, "uFade"), fade);
    gl.uniform1i(gl.getUniformLocation(this.blitProgram, "uUseBackground"), withBackground ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  private drawInstances(instances: StrokeInstances, config: GlobalConfig): void {
    const { gl } = this;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.sceneProgram);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instances.data.subarray(0, instances.count * 6), gl.DYNAMIC_DRAW);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture);
    gl.uniform1i(gl.getUniformLocation(this.sceneProgram, "uPalette"), 0);
    gl.uniform1f(gl.getUniformLocation(this.sceneProgram, "uIntensity"), config.inkIntensity);
    gl.uniform1f(gl.getUniformLocation(this.sceneProgram, "uPaletteBands"), config.paletteBands);
    gl.uniform2f(gl.getUniformLocation(this.sceneProgram, "uContain"), this.contain[0], this.contain[1]);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instances.count);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  private createFramebufferPair(width: number, height: number): FramebufferPair | undefined {
    const { gl } = this;
    const textures: WebGLTexture[] = [];
    const framebuffers: WebGLFramebuffer[] = [];
    try {
      for (let index = 0; index < 2; index += 1) {
        const texture = gl.createTexture();
        const framebuffer = gl.createFramebuffer();
        if (!texture || !framebuffer) throw new Error("Unable to allocate persistence target.");
        textures.push(texture);
        framebuffers.push(framebuffer);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Incomplete persistence framebuffer.");
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return {
        textures: textures as [WebGLTexture, WebGLTexture],
        framebuffers: framebuffers as [WebGLFramebuffer, WebGLFramebuffer],
        width,
        height,
        source: 0,
      };
    } catch {
      for (const texture of textures) gl.deleteTexture(texture);
      for (const framebuffer of framebuffers) gl.deleteFramebuffer(framebuffer);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return undefined;
    }
  }

  private disposeFramebufferPair(pair: FramebufferPair): void {
    for (const texture of pair.textures) this.gl.deleteTexture(texture);
    for (const framebuffer of pair.framebuffers) this.gl.deleteFramebuffer(framebuffer);
  }

  destroy(): void {
    if (this.framebuffers) this.disposeFramebufferPair(this.framebuffers);
    this.gl.deleteProgram(this.sceneProgram);
    this.gl.deleteProgram(this.blitProgram);
    this.gl.deleteBuffer(this.cornerBuffer);
    this.gl.deleteBuffer(this.instanceBuffer);
    this.gl.deleteTexture(this.paletteTexture);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteVertexArray(this.blitVao);
  }
}
