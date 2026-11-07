/*
  Spline scenes for Four Seasons Land (四季樂園).

  Each slot takes a scene exported from the Spline editor (Export > Code > download the .splinecode file),
  published next to the game, for example 'spline/scenes/doudou.splinecode'.
  Leave a slot null and the game keeps using its built-in 3D model for that character.

  poster: an image for the small pictures (hero cards, map marker, the button in the corner, guide portraits).
          One path, or four paths for growth stages 0 to 3 (baby, scarf, backpack, crown).
          Export it from Spline with Export > Image, 512 x 512, transparent background.

  The scene contract (object names, the "stage" variable, events) is in the design doc, section "Spline scenes".
*/
window.LL_SPLINE = {
  runtime: 'spline/runtime/runtime.standalone.webgl.js',
  wasmPath: 'spline/runtime',

  gate: { scene: null, openMs: 900 },

  characters: {
    doudou:   { scene: null, poster: null },
    bobo:     { scene: null, poster: null },
    xiaoju:   { scene: null, poster: null },
    paopao:   { scene: null, poster: null },
    xingxing: { scene: null, poster: null },
    owl:      { scene: null, poster: null },
    deer:     { scene: null, poster: null }
  }
};
