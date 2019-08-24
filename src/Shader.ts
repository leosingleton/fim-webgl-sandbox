// WebGL Sandbox
// Copyright (c) Leo C. Singleton IV <leo@leosingleton.com>
// See LICENSE in the project root for license information.

import { Program } from './Program';
import { using } from '@leosingleton/commonlibs';
import { FimGLCanvas } from '@leosingleton/fim';
import { FimGLVariableDefinition, FimGLVariableDefinitionMap,
  FimGLShader } from '@leosingleton/fim/build/dist/gl/FimGLShader';

export class Shader implements FimGLShader {
  public constructor(name: string, sourceCode: string, id?: number) {
    let match: RegExpExecArray

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

    // Parse the source code looking for uniforms
    let uniformRegex = /uniform\s(\w+)\s(\w+)/g;
    while (match = uniformRegex.exec(sourceCode)) {
      this.uniforms[match[2]] = {
        variableName: match[2],
        variableType: match[1]
      };
    }

    // Try to compile the shader
    using(new FimGLCanvas(100, 100), gl => {
      using(new Program(gl, this), program => {
        program.compileProgram();
      });
    });

    // Write the shader to local storage
    localStorage.setItem(`shader_name_${id}`, name);
    localStorage.setItem(`shader_source_${id}`, sourceCode);
  }

  public readonly id: number;
  public readonly name: string;
  public readonly sourceCode: string;
  public readonly uniforms: FimGLVariableDefinitionMap = {};
  public readonly consts: FimGLVariableDefinitionMap = {};
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

/** Adds an additional property to the existing interface */
export interface VariableDefinition extends FimGLVariableDefinition {
  /** Uniform value, as it appears as a string in the UI */
  dialogValue: string;
}
