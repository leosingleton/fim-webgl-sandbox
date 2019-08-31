// WebGL Sandbox
// Copyright (c) Leo C. Singleton IV <leo@leosingleton.com>
// See LICENSE in the project root for license information.

import { Program } from './Program';
import { using } from '@leosingleton/commonlibs';
import { FimGLCanvas } from '@leosingleton/fim';
import { FimGLVariableDefinition } from '@leosingleton/fim/build/dist/gl/FimGLShader';
import { GlslShader } from 'webpack-glsl-minify';
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

    // Populate any @const values with some value to keep the WebGL compiler happy
    for (let cname in this.shader.consts) {
      let c = this.shader.consts[cname] as VariableDefinition;
      if (!c.variableValue) {
        switch (c.variableType) {
          case 'int':
          case 'uint':
          case 'float':
          case 'double':
            c.variableValue = 1;
            break;

          case 'vec2':
          case 'bvec2':
          case 'ivec2':
          case 'uvec2':
            c.variableValue = [0, 0];
            break;
          
          case 'vec3':
          case 'bvec3':
          case 'ivec3':
          case 'uvec3':
            c.variableValue = [0, 0, 0];
            break;

          case 'vec4':
          case 'bvec4':
          case 'ivec4':
          case 'uvec4':
            c.variableValue = [0, 0, 0, 0];
            break;

          case 'bool':
            c.variableValue = true;
            break;

          case 'mat2':
          case 'mat2x2':
            c.variableValue = [0, 0, 0, 0];
            break;

          case 'mat2x3':
          case 'mat3x2':
            c.variableValue = [0, 0, 0, 0, 0, 0];
            break;

          case 'mat2x4':
          case 'mat4x2':
            c.variableValue = [0, 0, 0, 0, 0, 0, 0, 0];
            break;

          case 'mat3':
          case 'mat3x3':
            c.variableValue = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            break;

          case 'mat3x4':
          case 'mat4x3':
            c.variableValue = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            break;

          case 'mat4':
          case 'mat4x4':
            c.variableValue = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            break;

          default:
            c.variableValue = [1];
            break;
        }
      }
    }

    // Try to compile the shader
    using(new FimGLCanvas(100, 100), gl => {
      using(new Program(gl, this.shader), program => {
        program.compileProgram();
      });
    });

    // Write the shader to local storage
    localStorage.setItem(`shader_name_${this.id}`, this.name);
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
export interface VariableDefinition extends FimGLVariableDefinition {
  /** Uniform value, as it appears as a string in the UI */
  dialogValue: string;

  /** For sampler2D uniforms, controls whether linear filtering is enabled */
  enableLinearFiltering: boolean;
}
