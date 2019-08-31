// WebGL Sandbox
// Copyright (c) Leo C. Singleton IV <leo@leosingleton.com>
// See LICENSE in the project root for license information.

import { Program } from './Program';
import { using } from '@leosingleton/commonlibs';
import { FimGLCanvas } from '@leosingleton/fim';
import { GlslShader, GlslVariable } from 'webpack-glsl-minify';
import { GlslMinify } from 'webpack-glsl-minify/build/minify.js';

export class Shader {
  public constructor(name: string, sourceCode: string, id?: number) {
    if (!id) {
      id = ++Shader.idCount;
    }

    // When loading from localStorage, also increment the next ID
    if (id > Shader.idCount) {
      Shader.idCount = id;
    }

    this.id = id;
    this.name = name;
    this.sourceCode = sourceCode;
  }

  public async compile(): Promise<void> {
    // Use webpack-glsl-minify to parse the source code
    let minify = new GlslMinify({
      preserveDefines: true,
      preserveUniforms: true,
      preserveVariables: true
    });
    this.shader = await minify.execute(this.sourceCode);

    // Try to compile the shader
    using(new FimGLCanvas(100, 100), gl => {
      using(new Program(gl, this.shader), program => {
        program.compileProgram();
      });
    });

    // Write the shader to local storage
    localStorage.setItem(`shader_name_${this.id}`, name);
    localStorage.setItem(`shader_source_${this.id}`, this.sourceCode);
  }

  public readonly id: number;
  public readonly name: string;
  public readonly sourceCode: string;
  public shader: GlslShader;
  public executionCount = 0;

  public static createFromFile(file: File): Promise<Shader> {
    return new Promise((resolve, reject) => {
      let fr = new FileReader();
      fr.readAsText(file);

      // On success, create a Shader and return it via the Promise
      fr.onload = () => {
        let source = fr.result as string;
        let shader = new Shader(file.name, source);
        resolve(shader);
      };

      // On error, return an exception via the Promise
      fr.onerror = err => {
        reject(err);
      };
    });
  }

  private static idCount = 0;
}

/** Adds additional properties to the existing interface to track dialog state and avoid creating a new object */
export interface VariableDefinition extends GlslVariable {
  /** Uniform value, as it appears as a string in the UI */
  dialogValue: string;

  /** For sampler2D uniforms, controls whether linear filtering is enabled */
  enableLinearFiltering: boolean;
}
