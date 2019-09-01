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
  public constructor(name: string, sourceCode: string, idOrOldShader?: number | Shader) {
    let id: number;
    if (typeof idOrOldShader === 'number') {
      id = idOrOldShader;
    } else if (typeof idOrOldShader === 'object') {
      id = idOrOldShader.id;
      this.executionCount = idOrOldShader.executionCount;
    } else {
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
  }

  public writeToLocalStorage(): void {
    localStorage.setItem(`shader_${this.id}_name`, this.name);
    localStorage.setItem(`shader_${this.id}_source`, this.sourceCode);

    // Save constant values
    for (let cname in this.shader.consts) {
      let c = this.shader.consts[cname] as VariableDefinition;
      localStorage.setItem(`shader_${this.id}_const_${cname}`, c.dialogValue);
    }

    // Save uniform values
    for (let uname in this.shader.uniforms) {
      let u = this.shader.uniforms[uname] as VariableDefinition;
      localStorage.setItem(`shader_${this.id}_uniform_${uname}`, u.dialogValue);
    }
  }

  public deleteFromLocalStorage(): void {
    for (let key in localStorage) {
      if (key.indexOf(`shader_${this.id}_`) === 0) {
        localStorage.removeItem(key);
      }
    }
  }

  public readonly id: number;
  public readonly name: string;
  public readonly sourceCode: string;
  public shader: GlslShader;
  public executionCount = 0;

  public static async createFromFile(file: File): Promise<Shader> {
    let shader = await this.createFromFileHelper(file);
    await shader.compile();
    return shader;
  }

  private static createFromFileHelper(file: File): Promise<Shader> {
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

  public static async createFromLocalStorage(id: number): Promise<Shader> {
    let name = localStorage.getItem(`shader_${id}_name`);
    let source = localStorage.getItem(`shader_${id}_source`);

    // Create the shader
    let shader = new Shader(name, source, id);
    await shader.compile();

    // Load constant values
    for (let cname in shader.shader.consts) {
      let c = shader.shader.consts[cname] as VariableDefinition;
      c.dialogValue = localStorage.getItem(`shader_${id}_const_${cname}`);
    }

    // Load uniform values
    for (let uname in shader.shader.uniforms) {
      let u = shader.shader.uniforms[uname] as VariableDefinition;
      u.dialogValue = localStorage.getItem(`shader_${id}_uniform_${uname}`);
    }

    return shader;
  }

  public static async createAllFromLocalStorage(): Promise<Shader[]> {
    let shaders: Shader[] = [];

    for (let n = 0; n < localStorage.length; n++) {
      let key = localStorage.key(n);
      let parts = key.split('_');
      if (parts.length === 3 && parts[0] === 'shader' && parts[2] === 'name') {
        // We found a shader
        let id = Number.parseInt(parts[1]);
        shaders.push(await this.createFromLocalStorage(id));
      }
    }

    return shaders;
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
