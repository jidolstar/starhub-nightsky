# Third Party Notices

## NPM dependencies

This project uses the following third-party packages:

- `three` - MIT
- `astronomy-engine` - MIT
- `vue` - MIT
- `pinia` - MIT
- `vite` - MIT
- `@vitejs/plugin-vue` - MIT
- `@vue/tsconfig` - MIT
- `vue-tsc` - MIT
- `typescript` - Apache-2.0
- `@types/node` - MIT
- `@types/three` - MIT

## d3-celestial

`src/starhub-nightsky/data/Constellations.ts` includes data derived from the d3-celestial GeoJSON constellation data:

- https://github.com/ofrohn/d3-celestial/blob/master/data/constellations.lines.json
- https://github.com/ofrohn/d3-celestial/blob/master/data/constellations.json

License text from d3-celestial:

```text
Copyright (c) 2015, Olaf Frohn
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## IAU constellation boundaries

`src/starhub-nightsky/data/ConstellationBoundaries.ts` includes data derived from the International Astronomical Union's official constellation boundary TXT files:

- https://www.iau.org/IAU/Iau/Science/What-we-do/The-Constellations.aspx
- https://iauarchive.eso.org/static/public/constellations/txt/
