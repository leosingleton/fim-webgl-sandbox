// WebGL Sandbox
// Copyright (c) Leo C. Singleton IV <leo@leosingleton.com>
// See LICENSE in the project root for license information.

import { FimGLCanvas, FimGLProgram, FimGLTexture } from '@leosingleton/fim';
import { FimGLShader } from '@leosingleton/fim/build/dist/gl/FimGLShader';

export class Program extends FimGLProgram {
  public constructor(canvas: FimGLCanvas, fragmentShader: FimGLShader) {
    super(canvas, fragmentShader);
  }

  public compileProgram(): void {
    super.compileProgram();
  }

  public setUniform(name: string, value: number | number[] | boolean | FimGLTexture): void {
    this.fragmentShader.uniforms[name].variableValue = value;
  }
}
