// WebGL Sandbox
// Copyright (c) Leo C. Singleton IV <leo@leosingleton.com>
// See LICENSE in the project root for license information.

import { IPerformanceResults, perfTest } from './Common';
import { Program } from './Program';
import { createSampleShaders } from './SampleShaders';
import { SelectChannelProgram } from './SelectChannel';
import { Shader, VariableDefinition } from './Shader';
import { Texture } from './Texture';
import { DisposableSet } from '@leosingleton/commonlibs';
import { FimCanvas, FimGLCanvas, FimGLTexture, FimGLTextureOptions, FimGLTextureFlags } from '@leosingleton/fim';
import { saveAs } from 'file-saver';
import $ from 'jquery';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

$(async () => {
  // Load previous shaders from local storage on startup
  for (let n = 0; n < localStorage.length; n++) {
    let key = localStorage.key(n);
    if (key.indexOf('shader_name_') === 0) {
      // We found a shader
      let id = Number.parseInt(key.substring(12));
      let name = localStorage.getItem(`shader_name_${id}`);
      let source = localStorage.getItem(`shader_source_${id}`);

      // Create the shader
      let shader = new Shader(name, source, id);
      await shader.compile();
      shaders.push(shader);  
    }
  }

  // If there are no shaders in load storage, populate the app with some sample ones to get started
  if (shaders.length === 0) {
    shaders = createSampleShaders();
  }

  refreshShaderList();
});

export namespace Editor {
  export function addShader(): void {
    onEditShader();
  }

  export async function addShaderOk(): Promise<void> {
    try {
      let name = $('#add-shader-name').val().toString();
      if (!name) {
        throw new Error('Name is required');
      }

      let source = $('#add-shader-source').val().toString();
      if (!source) {
        throw new Error('Source code is required');
      }

      let id = currentShader ? currentShader.id : null;
      let shader = new Shader(name, source, id);
      await shader.compile();
      shaders = shaders.filter(s => s !== currentShader);
      shaders.push(shader);
      refreshShaderList();

      $('#add-shader').modal('hide');
    } catch (err) {
      $('#add-shader-errors').text(err);
      $('#add-shader-errors').show();
    }
  }

  /** Handler for the 'Run Performance Test' button in the execute shader dialog */
  export function executePerformanceTest(): void {
    try {
      let results = runCurrentShader(true) as IPerformanceResults;
      $('#performance-results-body').text(results.message);
      $('#performance-results').modal('show');
    } catch (err) {
      $('#execute-shader-errors').text(err);
      $('#execute-shader-errors').show();
    }
  }

  /** Handler for the OK button in the execute shader dialog */
  export function executeShaderOk(): void {
    try {
      let canvas = runCurrentShader() as FimCanvas;

      let texture = new Texture(`Output of ${currentShader.name} ${++currentShader.executionCount}`, canvas);
      textures.push(texture);
      refreshTextureList();

      $('#execute-shader').modal('hide');
    } catch (err) {
      $('#execute-shader-errors').text(err);
      $('#execute-shader-errors').show();
    }
  }

  export async function uploadShaders(files: FileList): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      shaders.push(await Shader.createFromFile(files[i]));
    }
    refreshShaderList();
  }

  export async function uploadTextures(files: FileList): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      textures.push(await Texture.createFromFile(files[i]));
    }
    refreshTextureList();
  }
}

let shaders: Shader[] = [];

function refreshShaderList(): void {
  // Sort alphabetically by name
  shaders = shaders.sort(sortByName);

  $('#shaders tr').remove();
  shaders.forEach(shader => {
    let row = $('<tr/>').appendTo('#shaders');
    row.append($('<td/>').text(shader.name));

    let actions = $('<td/>').appendTo(row);
    actions.append($('<a href="#">Execute</a>').click(() => onExecuteShader(shader)));
    actions.append(' | ');
    actions.append($('<a href="#">Edit</a>').click(() => onEditShader(shader)));
    actions.append(' | ');
    actions.append($('<a href="#">Delete</a>').click(() => onDeleteShader(shader)));
  });
}

let currentShader: Shader = null;

/** Displays the execute shader dialog box */
function onExecuteShader(shader: Shader): void {
  currentShader = shader;
  let s = shader.shader;

  $('#execute-shader-form div').remove();

  for (let uname in s.uniforms) {
    let u = s.uniforms[uname] as VariableDefinition;
    let id = `uniform-${u.variableName}`;
    let text = `${u.variableName} (${u.variableType})`;

    let group = $('<div class="form-group"/>').appendTo('#execute-shader-form');
    group.append($('<label class="control-label"/>').attr('for', id).text(text));
    if (u.variableType.indexOf('sampler') === -1) {
      group.append($('<input type="text" class="form-control"/>').attr('id', id).val(u.dialogValue));
    } else {
      // sampler2D uniforms are special: We show a drop-down of textures instead
      let select = $('<select class="form-control"/>').attr('id', id).appendTo(group);
      textures.forEach(texture => {
        let name = `${texture.name} (${texture.canvas.w} x ${texture.canvas.h})`;
        select.append($('<option/>').attr('value', texture.id).text(name));
      });

      // Set the default selected option
      if (u.dialogValue) {
        select.val(u.dialogValue);
      }

      // Also show a checkbox to enable linear sampling
      let check = $('<div class="form-check"/>').appendTo('#execute-shader-form');
      let checkId = `linear-${u.variableName}`;
      check.append($('<input type="checkbox" class="form-check-input"/>').attr('id', checkId).prop('checked',
        u.enableLinearFiltering));
      check.append($('<label class="form-check-label"/>').attr('for', checkId).text('Enable linear filtering'));
    }
  }

  $('#execute-shader-errors').hide();
  $('#execute-shader').modal('show');
}

/** Handles the OK button on the execute shader dialog */
function runCurrentShader(performanceTest = false): FimCanvas | IPerformanceResults {
  let s = currentShader.shader;
  let result: FimCanvas | IPerformanceResults;

  let width = $('#execute-shader-width').val() as number;
  let height = $('#execute-shader-height').val() as number;

  DisposableSet.using(disposable => {
    let gl = disposable.addDisposable(new FimGLCanvas(width, height));
    let program = disposable.addDisposable(new Program(gl, s));

    for (let uname in s.uniforms) {
      let u = s.uniforms[uname];
      let id = `#uniform-${u.variableName}`;
      let value = eval($(id).val().toString());
      if (u.variableType.indexOf('sampler') === -1) {
        program.setUniform(uname, value);
      } else {
        let canvas = textures.find(v => v.id === value).canvas;
        let linear = $(`#linear-${u.variableName}`).prop('checked') as boolean;
        let options: FimGLTextureOptions = linear ? { textureFlags: FimGLTextureFlags.LinearSampling } : {};
        let inputTexture = disposable.addDisposable(new FimGLTexture(gl, canvas.w, canvas.h, options));
        inputTexture.copyFrom(canvas);
        program.setUniform(uname, inputTexture);
      }
    }
    
    if (performanceTest) {
      result = perfTest(currentShader.name, () => program.execute());
    } else {
      program.execute();
      result = gl.duplicateCanvas();
    }
  });

  // On success, store the values for the next time the execute dialog is opened for this shader
  for (let uname in s.uniforms) {
    let u = s.uniforms[uname] as VariableDefinition;
    u.dialogValue = $(`#uniform-${u.variableName}`).val().toString();
    u.enableLinearFiltering = $(`#linear-${u.variableName}`).prop('checked');
  }

  return result;
}

/**
 * Displays the dialog box to create or edit a shader
 * @param shader The existing shader if editing. A create dialog is displayed if undefined.
 */
function onEditShader(shader?: Shader): void {
  currentShader = shader;
  $('#add-shader-title').text(shader ? 'Edit Shader' : 'Create New Shader');
  $('#add-shader-ok').text(shader ? 'Edit' : 'Create');
  $('#add-shader-name').val(shader ? shader.name : '');
  $('#add-shader-source').val(shader ? shader.sourceCode : '');
  $('#add-shader-errors').hide();
  $('#add-shader').modal('show');
}

function onDeleteShader(shader: Shader): void {
  shaders = shaders.filter(s => s !== shader);
  refreshShaderList();

  // Also delete from local storage
  localStorage.removeItem(`shader_name_${shader.id}`);
  localStorage.removeItem(`shader_source_${shader.id}`);
}

let textures: Texture[] = [];

function refreshTextureList(): void {
  // Sort alphabetically by name
  textures = textures.sort(sortByName);

  $('#textures tr').remove();
  textures.forEach(texture => {
    let row = $('<tr/>').appendTo('#textures');
    if (!texture.isRenaming) {
      row.append($('<td/>').text(texture.name));
    } else {
      // When renaming, the name becomes an edit box
      row.append($('<td/>').append($('<input type="text" id="rename-texture" class="form-control"/>')
        .val(texture.name).focusout(() => onRenameTextureDone(texture))));
    }

    // Dimensions column
    row.append($('<td/>').html(`${texture.canvas.w}&nbsp;x&nbsp;${texture.canvas.h}`));

    let actions = $('<td/>').appendTo(row);
    actions.append($('<a href="#">View</a>').click(() => onViewTexture(texture)));
    actions.append('&nbsp;(');
    actions.append($('<a href="#">R</a>').click(() => onViewTextureChannel(texture, 'R')));
    actions.append('&nbsp;');
    actions.append($('<a href="#">G</a>').click(() => onViewTextureChannel(texture, 'G')));
    actions.append('&nbsp;');
    actions.append($('<a href="#">B</a>').click(() => onViewTextureChannel(texture, 'B')));
    actions.append('&nbsp;');
    actions.append($('<a href="#">A</a>').click(() => onViewTextureChannel(texture, 'A')));
    actions.append(') | ');
    actions.append($('<a href="#">Download</a>').click(() => onDownloadTexture(texture)));
    actions.append(' | ');
    actions.append($('<a href="#">Rename</a>').click(() => onRenameTexture(texture)));
    actions.append(' | ');
    actions.append($('<a href="#">Delete</a>').click(() => onDeleteTexture(texture)));
  });
}

/** Called when the button to rename a texture is clicked. Changes the name to an edit box. */
function onRenameTexture(texture: Texture): void {
  texture.isRenaming = true;
  refreshTextureList();
}

/** Called when the edit box to rename a texture loses focus. Performs the actual rename. */
function onRenameTextureDone(texture: Texture): void {
  let name = $('#rename-texture').val().toString();
  let newTexture = new Texture(name, texture.canvas);
  textures = textures.filter(t => t !== texture);
  textures.push(newTexture);
  refreshTextureList();
}

function onViewTexture(texture: Texture): Promise<void> {
  return onViewCanvas(texture.canvas);
}

async function onViewCanvas(canvas: FimCanvas): Promise<void> {
  let blob = await canvas.toPngBlob();

  let fr = new FileReader();
  fr.readAsDataURL(blob);
  fr.onload = () => {
    let img = new Image();
    img.src = fr.result as string;

    let popup = window.open('');
    popup.document.write(img.outerHTML);
  };
}

function onViewTextureChannel(texture: Texture, channel: 'R' | 'G' | 'B' | 'A'): Promise<void> {
  let result: Promise<void>;
  DisposableSet.using(disposable => {
    let oldCanvas = texture.canvas;
    let gl = disposable.addDisposable(new FimGLCanvas(oldCanvas.w, oldCanvas.h));
    let tex = disposable.addDisposable(FimGLTexture.createFrom(gl, oldCanvas));
    let p = disposable.addDisposable(new SelectChannelProgram(gl));
    p.setInputs(tex, channel);
    p.execute();

    let newCanvas = disposable.addDisposable(gl.duplicateCanvas());
    result = onViewCanvas(newCanvas);
  });

  return result;
}

/** Handler for the Download button */
async function onDownloadTexture(texture: Texture): Promise<void> {
  // Generate a filename for the download by replacing all non-alphanumeric characters with underscores
  let filename = texture.name.replace(/[^\w]/g, '_') + '.png';

  // Save the output
  let blob = await texture.canvas.toPngBlob();
  saveAs(blob, filename);
}

function onDeleteTexture(texture: Texture): void {
  texture.canvas.dispose();
  textures = textures.filter(t => t !== texture);
  refreshTextureList();
}

/** Helper function for Array.sort() */
function sortByName(obj1: Shader | Texture, obj2: Shader | Texture): number {
  let name1 = obj1.name.toUpperCase();
  let name2 = obj2.name.toUpperCase();

  if (name1 < name2) {
    return -1;
  } else if (name1 > name2) {
    return 1;
  } else {
    return 0;
  }
}
