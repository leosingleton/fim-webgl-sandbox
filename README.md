# WebGL Sandbox
[![Build Status](https://dev.azure.com/leosingleton/fim-webgl-sandbox/_apis/build/status/leosingleton.fim-webgl-sandbox?branchName=master)](https://dev.azure.com/leosingleton/fim-webgl-sandbox/_build/latest?definitionId=6&branchName=master)

This application demonstrates the [FIM](https://github.com/leosingleton/fim) (Fast Image Manipulation) library.

It works much like [Shadertoy](https://www.shadertoy.com) or [GLSL Sandbox](http://glslsandbox.com/) and allows
creating, testing, and debugging GLSL fragment shaders in a web browser. However, unlike the others which focus
primarily on animated demoscenes, WebGL Sandbox provides minimal framework allowing testing of existing GLSL shaders,
including creating uniforms and importing existing JPEG or PNG images as textures. This is particularly useful for
testing and applying filters to images.

<p align="center" >
  <img src="https://www.leosingleton.com/webgl-sandbox/assets/icons/play-circle.svg" width="64" height="64" /><br/>
  <a href="https://www.leosingleton.com/webgl-sandbox/">Try it out</a>
</p>

## Building from source

Development build:
```
npm install
npm run build
```

Production build:
```
npm install
npm run build:production
```

## License
Copyright (c) 2016-2019 [Leo C. Singleton IV](https://www.leosingleton.com/).
This software is licensed under the MIT License.
