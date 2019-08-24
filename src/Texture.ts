// WebGL Sandbox
// Copyright (c) Leo C. Singleton IV <leo@leosingleton.com>
// See LICENSE in the project root for license information.

import { FimCanvas } from '@leosingleton/fim';

export class Texture {
  public constructor(name: string, canvas: FimCanvas) {
    this.id = ++Texture.idCount;
    this.name = name;
    this.canvas = canvas;
  }

  public readonly id: number;
  public readonly name: string;
  public readonly canvas: FimCanvas;
  public isRenaming = false;

  public static async createFromFile(file: File): Promise<Texture> {
    let canvas = await FimCanvas.createFromImageBlob(file);
    return new Texture(file.name, canvas);
  }

  private static idCount = 0;
}
